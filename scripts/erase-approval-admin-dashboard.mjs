import { createClient } from '@libsql/client';
import { APPROVAL_ADMIN } from '../lib/access-core.mjs';

// Exact targets were inspected before this script was added. Never accepts arbitrary email or workspace arguments.
const workspaceId = '96gfh2agbpbvffp';
const userId = 'user_3ERyOSgpwaQLmHd3YQKQ510dkmq';
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const quote = (name) => `"${name.replaceAll('"','""')}"`;
const tx = await db.transaction('write');
try {
  const workspace = (await tx.execute({ sql: 'SELECT * FROM workspaces WHERE id=?', args: [workspaceId] })).rows[0];
  if (workspace && workspace.created_by_clerk_id !== userId) throw new Error('Workspace ownership changed. Cleanup stopped.');
  const other = (await tx.execute({ sql: 'SELECT id FROM memberships WHERE workspace=? AND (clerk_user_id<>? OR lower(email)<>?)', args: [workspaceId, userId, APPROVAL_ADMIN] })).rows;
  if (other.length) throw new Error('Workspace now has another member. Cleanup stopped.');
  const tables = (await tx.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'access_%'")).rows;
  const commands = [];
  for (const { name } of tables) {
    const columns = (await tx.execute(`PRAGMA table_info(${quote(name)})`)).rows.map(row => row.name);
    let sql, args;
    if (columns.includes('workspace')) { sql = `DELETE FROM ${quote(name)} WHERE workspace=?`; args = [workspaceId]; }
    else if (name === 'workspaces') { sql = 'DELETE FROM workspaces WHERE id=?'; args = [workspaceId]; }
    else if (name === 'users') { sql = 'DELETE FROM users WHERE id=?'; args = [userId]; }
    else if (name === 'request_limits') { sql = 'DELETE FROM request_limits WHERE instr(key,?)>0 OR instr(key,?)>0'; args = [workspaceId, userId]; }
    else if (name === 'kv') { sql = 'DELETE FROM kv WHERE instr(key,?)>0 OR instr(key,?)>0 OR instr(value,?)>0 OR instr(value,?)>0'; args = [workspaceId, userId, workspaceId, userId]; }
    if (sql) commands.push({ name, sql, args });
  }
  // Delete children before the workspace, including on databases with foreign keys enabled.
  commands.sort((a, b) => Number(a.name === 'workspaces') - Number(b.name === 'workspaces'));
  for (const command of commands) {
    const count = await tx.execute({ sql: command.sql.replace(/^DELETE FROM/, 'SELECT COUNT(*) AS count FROM'), args: command.args });
    if (Number(count.rows[0].count)) console.log(`${command.name}: ${count.rows[0].count} records${process.argv.includes('--apply') ? ' deleted' : ' to delete'}`);
    if (process.argv.includes('--apply')) await tx.execute(command);
  }
  if (process.argv.includes('--apply')) {
    await tx.commit();
    console.log('Exact admin workspace dashboard cleanup committed. Clerk login identity retained for compatibility. No backup was created.');
  } else { await tx.rollback(); console.log('Dry run only.'); }
} finally { tx.close(); db.close(); }
