import { createClient } from '@libsql/client';
import { APPROVAL_ADMIN } from '../lib/access-core.mjs';
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const workspaceId = '96gfh2agbpbvffp', userId = 'user_3ERyOSgpwaQLmHd3YQKQ510dkmq';
const tables = (await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'access_%'")).rows;
let remaining = 0;
for (const { name } of tables) {
  const table = `"${name.replaceAll('"','""')}"`;
  const columns = (await db.execute(`PRAGMA table_info(${table})`)).rows.map(row => row.name);
  if (columns.includes('workspace')) remaining += Number((await db.execute({ sql: `SELECT COUNT(*) AS n FROM ${table} WHERE workspace=?`, args: [workspaceId] })).rows[0].n);
}
remaining += Number((await db.execute({ sql: 'SELECT COUNT(*) AS n FROM workspaces WHERE id=?', args: [workspaceId] })).rows[0].n);
remaining += Number((await db.execute({ sql: 'SELECT COUNT(*) AS n FROM memberships WHERE lower(email)=? OR clerk_user_id=?', args: [APPROVAL_ADMIN, userId] })).rows[0].n);
console.log('Remaining admin dashboard records:', remaining);
console.log('Access tables:', (await db.execute("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name LIKE 'access_%'")).rows[0].n);
console.log('Configured approval link origin:', new URL(process.env.NEXT_PUBLIC_APP_URL).origin);
console.log('Configured sender:', process.env.SMTP_FROM_EMAIL);
const response = await fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` }, signal: AbortSignal.timeout(15000) });
const payload = await response.json();
console.log('Email domain inspection:', response.status, response.ok ? payload.data?.map(({ name, status }) => ({ name, status })) : payload.message);
db.close();
