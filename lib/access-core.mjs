import { createHash, createHmac, randomBytes, randomInt, randomUUID } from 'node:crypto';

export const APPROVAL_ADMIN = 'aadilhussainkhan7@gmail.com';
export const ACCESS_COOKIE = 'recruit-access';
export const SESSION_SECONDS = 8 * 60 * 60;
export const normalizeEmail = (value) => typeof value === 'string' ? value.trim().toLowerCase() : '';
export const hashToken = (value) => createHash('sha256').update(value).digest('hex');
export class AccessError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export const accessSchema = [
  `CREATE TABLE IF NOT EXISTS access_requests (
    number INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved')),
    name TEXT NOT NULL DEFAULT '', company TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '',
    volume TEXT NOT NULL DEFAULT '', message TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL, submitted_at INTEGER, approved_at INTEGER, approved_by TEXT,
    notification_sent_at INTEGER, notification_error TEXT, notification_key TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS access_otp (
    id TEXT PRIMARY KEY, email TEXT NOT NULL, digest TEXT NOT NULL, created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, consumed INTEGER NOT NULL DEFAULT 0
  )`,
  'CREATE INDEX IF NOT EXISTS access_otp_email ON access_otp(email, created_at)',
  `CREATE TABLE IF NOT EXISTS access_sessions (digest TEXT PRIMARY KEY, email TEXT NOT NULL, expires_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS access_rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL)`,
];
export async function migrateAccess(db) { await db.batch(accessSchema, 'write'); }

export async function provisionApprovedWorkspace(db, email, userId) {
  const tx = await db.transaction('write');
  try {
    const normalizedEmail = normalizeEmail(email);
    const entry = (await tx.execute({ sql: "SELECT * FROM access_requests WHERE email=? AND status='approved'", args: [normalizedEmail] })).rows[0];
    if (!entry || normalizeEmail(email) === APPROVAL_ADMIN) throw new AccessError('Approval is required.', 403);
    const member = (await tx.execute({ sql: 'SELECT id FROM memberships WHERE clerk_user_id=? LIMIT 1', args: [userId] })).rows[0];
    if (!member) {
      const workspaceId = hashToken(`workspace:${userId}`).slice(0, 15), memberId = hashToken(`owner:${userId}`).slice(0, 15);
      const accountName = entry.name || normalizedEmail.split('@')[0];
      const workspaceName = entry.company || `${accountName}'s team`;
      await tx.execute({ sql: 'INSERT INTO workspaces(id,name,slug,website,company_size,hiring_goal,created_by_clerk_id) VALUES (?,?,?,?,?,?,?)', args: [workspaceId, workspaceName, `team-${workspaceId}`, '', '', '', userId] });
      await tx.execute({ sql: "INSERT INTO memberships(id,workspace,clerk_user_id,email,name,role,job_function,status) VALUES (?,?,?,?,?,'owner','','active')", args: [memberId, workspaceId, userId, normalizedEmail, accountName] });
    }
    await tx.commit();
  } finally { tx.close(); }
}

export function validateWaitlist(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.website) throw new AccessError('Please check your details.');
  const result = {};
  for (const [key, max] of Object.entries({ name: 100, company: 160, phone: 30, volume: 50, message: 3000 })) {
    if (typeof data[key] !== 'string' || data[key].trim().length > max) throw new AccessError('Please check your details.');
    result[key] = data[key].trim();
  }
  if (!result.name || !result.company || result.message.length < 10 || /[\r\n]/.test(result.name + result.company + result.phone)
    || !['1-5 hires / month', '6-20 hires / month', '21-50 hires / month', '50+ hires / month', 'Just exploring'].includes(result.volume)
    || data.consent !== 'yes') throw new AccessError('Complete all required fields and agree to be contacted.');
  return result;
}

// All limits and one-time transitions live in SQL, so concurrent server instances share them.
export function createAccessService({ db, secret, sendMail, now = Date.now }) {
  if (!secret) throw new Error('Access authentication secret is missing.');
  const digestCode = (id, code) => createHmac('sha256', secret).update(`recruit-otp:${id}:${code}`).digest('hex');
  async function rateLimit(key, limit, windowMs) {
    const time = now();
    const result = await db.execute({ sql: `INSERT INTO access_rate_limits(key,count,expires_at) VALUES (?,1,?)
      ON CONFLICT(key) DO UPDATE SET count = CASE WHEN expires_at <= ? THEN 1 ELSE count+1 END,
      expires_at = CASE WHEN expires_at <= ? THEN excluded.expires_at ELSE expires_at END RETURNING count`,
    args: [hashToken(key), time + windowMs, time, time] });
    if (Number(result.rows[0].count) > limit) throw new AccessError('Too many attempts. Please try again later.', 429);
  }
  async function getRequest(email) {
    return (await db.execute({ sql: 'SELECT * FROM access_requests WHERE email = ?', args: [normalizeEmail(email)] })).rows[0] || null;
  }
  async function ensureRequest(email) {
    email = normalizeEmail(email);
    if (email === APPROVAL_ADMIN) throw new AccessError('The approval email cannot join the waiting list.');
    await db.execute({ sql: 'INSERT INTO access_requests(email,created_at) SELECT ?,? WHERE NOT EXISTS (SELECT 1 FROM access_requests WHERE email=?) ON CONFLICT(email) DO NOTHING', args: [email, now(), email] });
    return getRequest(email);
  }
  async function requestOtp(value, ip) {
    const email = normalizeEmail(value);
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AccessError('Enter a valid email address.');
    await rateLimit(`ip:${ip}`, 20, 60 * 60 * 1000);
    await rateLimit(`email-minute:${email}`, 1, 60 * 1000);
    await rateLimit(`email-hour:${email}`, 6, 60 * 60 * 1000);
    const id = randomUUID(), code = String(randomInt(0, 1000000)).padStart(6, '0'), time = now();
    await db.batch([
      { sql: 'DELETE FROM access_otp WHERE email = ? OR expires_at < ?', args: [email, time] },
      { sql: 'DELETE FROM access_sessions WHERE expires_at < ?', args: [time] },
      { sql: 'DELETE FROM access_rate_limits WHERE expires_at < ?', args: [time] },
      { sql: 'INSERT INTO access_otp(id,email,digest,created_at,expires_at) VALUES (?,?,?,?,?)', args: [id, email, digestCode(id, code), time, time + 10 * 60 * 1000] },
    ], 'write');
    try {
      await sendMail({ to: email, subject: 'Your Recruit AI verification code', text: `Your Recruit AI verification code is ${code}.\n\nIt expires in 10 minutes. Do not share this code. If you did not request it, ignore this email.` });
    } catch {
      await db.execute({ sql: 'DELETE FROM access_otp WHERE id = ?', args: [id] });
      throw new AccessError('The verification email could not be sent. Please retry in a minute.', 503);
    }
    return { challengeId: id };
  }
  async function verifyOtp(id, code) {
    if (typeof id !== 'string' || id.length > 64 || typeof code !== 'string' || !/^\d{6}$/.test(code)) throw new AccessError('Enter the six-digit verification code.');
    const tx = await db.transaction('write');
    try {
      const result = await tx.execute({ sql: 'UPDATE access_otp SET attempts = attempts+1 WHERE id = ? AND consumed = 0 AND attempts < 5 AND expires_at > ? RETURNING *', args: [id, now()] });
      const otp = result.rows[0];
      if (!otp || otp.digest !== digestCode(id, code)) {
        await tx.commit();
        throw new AccessError('Invalid or expired code. Check your email or request a new code.');
      }
      await tx.execute({ sql: 'UPDATE access_otp SET consumed = 1 WHERE id = ?', args: [id] });
      const token = randomBytes(32).toString('hex');
      await tx.execute({ sql: 'INSERT INTO access_sessions(digest,email,expires_at) VALUES (?,?,?)', args: [hashToken(token), otp.email, now() + SESSION_SECONDS * 1000] });
      await tx.commit();
      return { email: otp.email, token };
    } finally { tx.close(); }
  }
  async function session(token) {
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return null;
    return (await db.execute({ sql: 'SELECT email FROM access_sessions WHERE digest = ? AND expires_at > ?', args: [hashToken(token), now()] })).rows[0] || null;
  }
  async function revokeSession(token) {
    if (typeof token === 'string') await db.execute({ sql: 'DELETE FROM access_sessions WHERE digest=?', args: [hashToken(token)] });
  }
  async function submit(email, data) {
    const fields = validateWaitlist(data);
    await ensureRequest(email);
    await db.execute({ sql: `UPDATE access_requests SET name=?,company=?,phone=?,volume=?,message=?,submitted_at=? WHERE email=? AND status='pending'`,
      args: [fields.name, fields.company, fields.phone, fields.volume, fields.message, now(), normalizeEmail(email)] });
    return getRequest(email);
  }
  async function approve(actor, number, loginUrl) {
    if (actor !== APPROVAL_ADMIN) throw new AccessError('Approval portal access required.', 403);
    if (!Number.isSafeInteger(number) || number < 1) throw new AccessError('Invalid request.');
      await db.execute({ sql: `UPDATE access_requests SET status='approved',approved_at=?,approved_by=?,notification_key=?
        WHERE number=? AND status='pending'`, args: [now(), actor, randomUUID(), number] });
    const row = (await db.execute({ sql: 'SELECT * FROM access_requests WHERE number=?', args: [number] })).rows[0];
      if (!row || row.status !== 'approved') throw new AccessError('This access request is unavailable.');
    if (row.notification_sent_at) return { approved: true, notified: true };
    try {
      await sendMail({ to: row.email, subject: 'You are approved — welcome to Recruit AI',
          text: `Hi ${row.name || 'there'},\n\nYour Recruit AI access request #${row.number} has been approved.\n\nSign in at ${loginUrl} using ${row.email} and verify the email code to open your hiring workspace.\n\nWelcome aboard,\nRecruit AI`, idempotencyKey: `approval-${row.notification_key}` });
      await db.execute({ sql: 'UPDATE access_requests SET notification_sent_at=?,notification_error=NULL WHERE number=?', args: [now(), number] });
      return { approved: true, notified: true };
    } catch {
      await db.execute({ sql: 'UPDATE access_requests SET notification_error=? WHERE number=?', args: ['Email delivery failed. Retry notification.', number] });
      return { approved: true, notified: false };
    }
  }
  return { requestOtp, verifyOtp, session, revokeSession, getRequest, ensureRequest, submit, approve, rateLimit };
}
