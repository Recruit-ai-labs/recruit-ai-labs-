// Explicit opt-in live test. Uses only tagged temporary records; never sends email or creates a Clerk user.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@libsql/client';
import { createAccessService, APPROVAL_ADMIN, provisionApprovedWorkspace, hashToken } from '../lib/access-core.mjs';
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const tag = randomUUID(), email = `access-test-${tag}@example.invalid`, userId = `access-test-${tag}`, ip = `test-${tag}`;
const workspaceId = hashToken(`workspace:${userId}`).slice(0,15), sent = [];
const service = createAccessService({ db, secret: process.env.CLERK_SECRET_KEY, sendMail: async message => { sent.push(message); } });
try {
  const { challengeId } = await service.requestOtp(email, ip);
  assert.equal(await service.getRequest(email), null);
  const code = sent[0].text.match(/code is (\d{6})/)[1];
  const identity = await service.verifyOtp(challengeId, code);
  assert.equal((await service.session(identity.token)).email, email);
  await assert.rejects(service.verifyOtp(challengeId, code));
  const application = await service.submit(email, { name: 'Temporary access test', company: 'Temporary access test', phone: '', volume: 'Just exploring', message: 'Temporary approval system integration test.', consent: 'yes' });
  assert.equal(application.status, 'pending');
  await assert.rejects(provisionApprovedWorkspace(db, email, userId), /Approval/);
  await service.approve(APPROVAL_ADMIN, Number(application.number), 'https://www.recruitailabs.in/sign-in');
  assert.equal(sent.length, 2);
  await provisionApprovedWorkspace(db, email, userId);
  await provisionApprovedWorkspace(db, email, userId);
  assert.equal((await db.execute({ sql: 'SELECT COUNT(*) AS n FROM memberships WHERE clerk_user_id=?', args: [userId] })).rows[0].n, 1);
  assert.equal((await db.execute({ sql: 'SELECT name FROM workspaces WHERE id=?', args: [workspaceId] })).rows[0].name, 'Temporary access test');
  console.log('PASS: real Turso OTP consumption/session, waiting list, approval gate, approval notification dispatch and idempotent workspace provisioning. No external emails sent.');
} finally {
  await db.batch([
    { sql: 'DELETE FROM memberships WHERE clerk_user_id=? AND email=?', args: [userId,email] },
    { sql: 'DELETE FROM workspaces WHERE id=? AND created_by_clerk_id=?', args: [workspaceId,userId] },
    { sql: 'DELETE FROM access_requests WHERE email=?', args: [email] },
    { sql: 'DELETE FROM access_sessions WHERE email=?', args: [email] },
    { sql: 'DELETE FROM access_otp WHERE email=?', args: [email] },
    ...[`ip:${ip}`, `email-minute:${email}`, `email-hour:${email}`].map(key => ({ sql: 'DELETE FROM access_rate_limits WHERE key=?', args: [hashToken(key)] })),
  ], 'write');
  console.log('Temporary test records removed.'); db.close();
}
