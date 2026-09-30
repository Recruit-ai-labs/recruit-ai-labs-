import 'server-only';
import { analyzeRole } from './tech-dna-ai';
import { interviewDB, secretHash } from './tech-dna-store';
export async function prepareRoleBlueprint(job) {
  const db = await interviewDB();
  const fingerprint = secretHash(JSON.stringify([job.title,job.description,job.responsibilities,job.must_have_skills]));
  const existing = (await db.execute({sql:'SELECT blueprint FROM sireen_roles WHERE job=? AND workspace=? AND fingerprint=?',args:[job.id,job.workspace,fingerprint]})).rows[0];
  if (existing) return JSON.parse(existing.blueprint);
  const blueprint = await analyzeRole(job);
  await db.execute({sql:'INSERT INTO sireen_roles(job,workspace,fingerprint,blueprint) VALUES (?,?,?,?) ON CONFLICT(job) DO UPDATE SET workspace=excluded.workspace,fingerprint=excluded.fingerprint,blueprint=excluded.blueprint',args:[job.id,job.workspace,fingerprint,JSON.stringify(blueprint)]});
  return blueprint;
}
