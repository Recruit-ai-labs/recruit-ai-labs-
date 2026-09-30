'use server';
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { requireWorkspace } from '../../../../../lib/workspace-page';
import { canManageJobs, getJobForWorkspace } from '../../../../../lib/recruit-data';
import { prepareRoleBlueprint } from '../../../../../lib/sireen-role';
import { interviewDB, opaqueToken } from '../../../../../lib/tech-dna-store';

export async function createSireenLink(_previous, form) {
  const { workspace, membership } = await requireWorkspace();
  if (!canManageJobs(membership)) return { error: 'You do not have permission to create interviews.' };
  const jobId = String(form.get('jobId') || '');
  const job = await getJobForWorkspace(workspace.id, jobId);
  if (!job || job.status !== 'open') return { error: 'Publish this job before creating an interview.' };
  try {
    const blueprint = await prepareRoleBlueprint(job);
    const db = await interviewDB();
    await db.execute({ sql: 'INSERT INTO sireen_links (id,workspace,job,token,blueprint,created,expires) VALUES (?,?,?,?,?,?,?)', args: [randomUUID(), workspace.id, job.id, opaqueToken(), JSON.stringify(blueprint), new Date().toISOString(), new Date(Date.now() + 14 * 86400000).toISOString()] });
    revalidatePath(`/dashboard/jobs/${jobId}/interview-link`);
    return { success: 'Interview ready. Share the link below.' };
  } catch { return { error: 'Could not analyze this job or save the interview. Check your AI/database configuration and retry.' }; }
}
export async function revokeSireenLink(form) {
  const { workspace, membership } = await requireWorkspace();
  if (!canManageJobs(membership)) return;
  const db = await interviewDB();
  await db.execute({ sql: 'UPDATE sireen_links SET revoked=1 WHERE id=? AND workspace=?', args: [String(form.get('linkId')), workspace.id] });
  revalidatePath('/dashboard/jobs', 'layout');
}
