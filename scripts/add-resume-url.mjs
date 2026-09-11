import { createClient } from '@libsql/client';
const c = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
try { await c.execute('ALTER TABLE "candidates" ADD COLUMN "resume_url" TEXT'); } catch (e) { if (!String(e.message).includes('duplicate')) throw e; }
console.log('candidates.resume_url ready');
