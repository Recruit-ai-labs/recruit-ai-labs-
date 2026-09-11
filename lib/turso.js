import 'server-only';

import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

export function getTursoClient() {
  if (!url || !authToken) {
    throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be configured.');
  }
  return createClient({ url, authToken });
}

export async function tursoHealthCheck() {
  const client = getTursoClient();
  const result = await client.execute('SELECT 1 AS ok');
  return result.rows[0]?.ok === 1;
}

