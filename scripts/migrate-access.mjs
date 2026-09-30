import { createClient } from '@libsql/client';
import { migrateAccess } from '../lib/access-core.mjs';
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
await migrateAccess(db);
console.log('Approval, OTP, session and rate-limit tables ready. Existing workspace access requires explicit approval.');
db.close();
