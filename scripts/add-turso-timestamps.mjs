import { createClient } from '@libsql/client';
const c = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const names = ['users','workspaces','memberships','jobs','candidates','applications','interviews','scorecards','talent_pools','talent_pool_members','activities','resume_extractions','candidate_job_evaluations','candidate_communications','interview_campaigns','interview_ai_evaluations','request_limits','workspace_subscriptions','candidate_vetting','talent_performance','assessments','outreach_sequences','outreach_enrollments'];
for (const name of names) for (const column of ['created', 'updated']) {
  try { await c.execute(`ALTER TABLE "${name}" ADD COLUMN "${column}" TEXT`); } catch (error) { if (!String(error.message).includes('duplicate')) throw error; }
}
console.log('Turso timestamp columns ready.');
