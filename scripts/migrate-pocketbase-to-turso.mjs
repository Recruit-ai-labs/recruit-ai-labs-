import { createClient } from '@libsql/client';

const pb = process.env.POCKETBASE_URL;
const email = process.env.POCKETBASE_ADMIN_EMAIL;
const password = process.env.POCKETBASE_ADMIN_PASSWORD;
const turso = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

const esc = (v) => String(v).replaceAll('"', '""');
const sqlName = (v) => `"${esc(v)}"`;
const typeMap = { number: 'REAL', bool: 'INTEGER', date: 'TEXT', autodate: 'TEXT', email: 'TEXT', url: 'TEXT', text: 'TEXT', select: 'TEXT', relation: 'TEXT', json: 'TEXT', file: 'TEXT', editor: 'TEXT' };

const authRes = await fetch(`${pb}/api/collections/_superusers/auth-with-password`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ identity: email, password }) });
if (!authRes.ok) throw new Error('PocketBase authentication failed');
const { token } = await authRes.json();
const headers = { Authorization: token };
const collections = (await (await fetch(`${pb}/api/collections?perPage=200`, { headers })).json()).items.filter((c) => !c.system);

for (const collection of collections) {
  const fields = collection.fields.filter((f) => !f.system);
  const columns = ['"id" TEXT PRIMARY KEY', ...fields.map((f) => `${sqlName(f.name)} ${typeMap[f.type] || 'TEXT'}`)];
  await turso.execute(`CREATE TABLE IF NOT EXISTS ${sqlName(collection.name)} (${columns.join(', ')})`);
  const records = (await (await fetch(`${pb}/api/collections/${encodeURIComponent(collection.name)}/records?perPage=500`, { headers })).json()).items || [];
  for (const record of records) {
    const names = ['id', ...fields.map((f) => f.name)];
    const values = names.map((name) => { const value = record[name]; if (value === undefined || value === null) return null; if (typeof value === 'boolean') return value ? 1 : 0; if (typeof value === 'object') return JSON.stringify(value); return value; });
    const placeholders = names.map(() => '?').join(', ');
    await turso.execute({ sql: `INSERT OR REPLACE INTO ${sqlName(collection.name)} (${names.map(sqlName).join(', ')}) VALUES (${placeholders})`, args: values });
  }
  console.log(`${collection.name}: ${records.length} records`);
}

console.log(`Migrated ${collections.length} collections.`);
