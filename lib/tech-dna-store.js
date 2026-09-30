import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { getTursoClient } from './turso';
import { interviewSchema } from './tech-dna-schema.mjs';

let schemaReady;
export async function interviewDB() {
  const db = getTursoClient();
  if (!schemaReady) schemaReady = db.batch(interviewSchema, 'write').catch(error => { schemaReady = null; throw error; });
  await schemaReady;
  return db;
}
export const opaqueToken = () => randomBytes(32).toString('hex');
export const secretHash = value => createHash('sha256').update(value).digest('hex');
export const sessionCookie = token => `sireen-${token.slice(0, 16)}`;
export function decodeSession(row) {
  if (!row) return null;
  return { ...row, questions: JSON.parse(row.questions), transcript: JSON.parse(row.transcript), dna: row.dna ? JSON.parse(row.dna) : null };
}
export async function getInterviewLink(token, includeExpired = false) {
  if (!/^[a-f0-9]{64}$/.test(token || '')) return null;
  const db = await interviewDB();
  const row = (await db.execute({ sql: 'SELECT * FROM sireen_links WHERE token = ?', args: [token] })).rows[0];
  if (!row || (!includeExpired && (row.revoked || row.expires < new Date().toISOString()))) return null;
  return { ...row, blueprint: JSON.parse(row.blueprint) };
}
export async function getSession(link, secret) {
  if (!secret) return null;
  const db = await interviewDB();
  return decodeSession((await db.execute({ sql: 'SELECT * FROM sireen_sessions WHERE link = ? AND secret_hash = ?', args: [link.id, secretHash(secret)] })).rows[0]);
}
export async function eventsFor(sessionId) {
  const db = await interviewDB();
  return (await db.execute({ sql: 'SELECT * FROM sireen_events WHERE session = ? ORDER BY created', args: [sessionId] })).rows;
}
export async function candidateInterviews(workspace, candidate) {
  const db = await interviewDB();
  const rows = (await db.execute({ sql: 'SELECT s.*,l.blueprint FROM sireen_sessions s JOIN sireen_links l ON l.id=s.link WHERE s.workspace=? AND s.candidate=? ORDER BY s.created DESC LIMIT 30', args: [workspace, candidate] })).rows;
  return Promise.all(rows.map(async row => ({ ...decodeSession(row), blueprint: JSON.parse(row.blueprint), events: await eventsFor(row.id) })));
}
export async function updateSession(session, patch) {
  const db = await interviewDB();
  const entries = Object.entries(patch);
  const allowed = new Set(['questions','transcript','dna','status']);
  if (entries.some(([key]) => !allowed.has(key))) throw new Error('Invalid session field');
  const result = await db.execute({ sql: `UPDATE sireen_sessions SET ${entries.map(([key]) => `${key}=?`).join(',')}, revision=revision+1, updated=? WHERE id=? AND revision=?`, args: [...entries.map(([, v]) => typeof v === 'object' ? JSON.stringify(v) : v), new Date().toISOString(), session.id, session.revision] });
  if (!result.rowsAffected) throw new Error('Session changed. Refresh to load the saved progress.');
}
export async function purgeCandidateInterviews(workspace, candidate) {
  if (!process.env.TURSO_DATABASE_URL) return;
  const db = await interviewDB();
  await db.batch([
    {sql:'DELETE FROM sireen_events WHERE session IN (SELECT id FROM sireen_sessions WHERE workspace=? AND candidate=?)',args:[workspace,candidate]},
    {sql:'DELETE FROM sireen_leases WHERE session IN (SELECT id FROM sireen_sessions WHERE workspace=? AND candidate=?)',args:[workspace,candidate]},
    {sql:'DELETE FROM sireen_sessions WHERE workspace=? AND candidate=?',args:[workspace,candidate]},
  ],'write');
}
