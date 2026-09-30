import { createClient } from '@libsql/client';
import { APPROVAL_ADMIN } from '../lib/access-core.mjs';
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const tables = (await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")).rows;
for (const { name } of tables) {
  const columns = (await db.execute(`PRAGMA table_info("${name.replaceAll('"','""')}")`)).rows.map(r => r.name);
  console.log(name + ': ' + columns.join(', '));
}
const members = await db.execute({ sql: 'SELECT id,workspace,clerk_user_id,role,status FROM memberships WHERE lower(email)=?', args: [APPROVAL_ADMIN] });
console.log('ADMIN MEMBERSHIPS', JSON.stringify(members.rows));
for (const m of members.rows) {
  console.log('WORKSPACE', JSON.stringify((await db.execute({ sql: 'SELECT id,name,created_by_clerk_id FROM workspaces WHERE id=?', args: [m.workspace] })).rows));
  console.log('OTHER MEMBERS', JSON.stringify((await db.execute({ sql: 'SELECT id,role,status FROM memberships WHERE workspace=? AND lower(email)<>?', args: [m.workspace, APPROVAL_ADMIN] })).rows));
}
const response = await fetch(`https://api.clerk.com/v1/users?email_address=${encodeURIComponent(APPROVAL_ADMIN)}`, { headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` } });
if (!response.ok) throw new Error(`Clerk inspection failed: ${response.status}`);
console.log('CLERK ADMIN IDS', JSON.stringify((await response.json()).map(u => u.id)));
db.close();
