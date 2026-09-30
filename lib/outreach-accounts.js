import 'server-only';

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { getTursoClient } from './turso';

function key() {
  const secret = process.env.OUTREACH_TOKEN_SECRET || process.env.ACCESS_AUTH_SECRET;
  if (!secret || secret.length < 24) throw new Error('OUTREACH_TOKEN_SECRET must be configured with at least 24 characters.');
  return createHash('sha256').update(secret).digest();
}
function seal(value) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.');
}
function open(value) {
  const [iv, tag, encrypted] = String(value).split('.').map((part) => Buffer.from(part, 'base64url'));
  const decipher = createDecipheriv('aes-256-gcm', key(), iv); decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
async function table(db) {
  await db.execute(`CREATE TABLE IF NOT EXISTS outreach_accounts (
    user_id TEXT NOT NULL, provider TEXT NOT NULL, email TEXT NOT NULL,
    access_token TEXT NOT NULL, refresh_token TEXT, expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, provider)
  )`);
}
export async function saveOutreachAccount({ userId, provider, email, accessToken, refreshToken, expiresAt }) {
  const db = getTursoClient(); await table(db);
  const current = await db.execute({ sql: 'SELECT refresh_token FROM outreach_accounts WHERE user_id = ? AND provider = ?', args: [userId, provider] });
  const storedRefresh = refreshToken ? seal(refreshToken) : current.rows[0]?.refresh_token;
  if (!storedRefresh) throw new Error('Provider did not return offline access. Reconnect the account and approve access.');
  const now = Date.now();
  await db.execute({ sql: `INSERT INTO outreach_accounts (user_id,provider,email,access_token,refresh_token,expires_at,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(user_id,provider) DO UPDATE SET email=excluded.email,access_token=excluded.access_token,refresh_token=excluded.refresh_token,expires_at=excluded.expires_at,updated_at=excluded.updated_at`,
    args: [userId, provider, email, seal(accessToken), storedRefresh, expiresAt, now, now] });
}
export async function getOutreachAccount(userId, provider = 'google', { secrets = false } = {}) {
  const db = getTursoClient(); await table(db);
  const result = await db.execute({ sql: 'SELECT provider,email,access_token,refresh_token,expires_at FROM outreach_accounts WHERE user_id = ? AND provider = ?', args: [userId, provider] });
  const row = result.rows[0]; if (!row) return null;
  return { provider: String(row.provider), email: String(row.email), expiresAt: Number(row.expires_at), ...(secrets ? { accessToken: open(row.access_token), refreshToken: open(row.refresh_token) } : {}) };
}
export async function deleteOutreachAccount(userId, provider = 'google') {
  const db = getTursoClient(); await table(db);
  await db.execute({ sql: 'DELETE FROM outreach_accounts WHERE user_id = ? AND provider = ?', args: [userId, provider] });
}
export async function googleAccessToken(userId) {
  const account = await getOutreachAccount(userId, 'google', { secrets: true });
  if (!account) return null;
  if (account.expiresAt > Date.now() + 60_000) return account;
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID || '', client_secret: process.env.GOOGLE_CLIENT_SECRET || '', refresh_token: account.refreshToken, grant_type: 'refresh_token' }), signal: AbortSignal.timeout(15000) });
  const token = await response.json().catch(() => null);
  if (!response.ok || !token?.access_token) throw new Error('The connected Google account needs to be reconnected.');
  await saveOutreachAccount({ userId, provider: 'google', email: account.email, accessToken: token.access_token, refreshToken: account.refreshToken, expiresAt: Date.now() + Number(token.expires_in || 3600) * 1000 });
  return { ...account, accessToken: token.access_token, expiresAt: Date.now() + Number(token.expires_in || 3600) * 1000 };
}
