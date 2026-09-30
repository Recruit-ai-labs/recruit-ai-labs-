'use server';
import { revalidatePath } from 'next/cache';
import { requireWorkspace } from '../../../../lib/workspace-page';
import { canManageCandidates } from '../../../../lib/recruit-data';
import { analyzeDNA } from '../../../../lib/tech-dna-ai';
import { decodeSession, interviewDB, updateSession } from '../../../../lib/tech-dna-store';
export async function retryTechDNA(_previous, form) {
  const { workspace, membership } = await requireWorkspace();
  if (!canManageCandidates(membership)) return {error:'You do not have permission to analyze interviews.'};
  try {
  const db = await interviewDB();
  const row = (await db.execute({sql:'SELECT s.*,l.blueprint FROM sireen_sessions s JOIN sireen_links l ON l.id=s.link WHERE s.id=? AND s.workspace=? AND s.candidate=?',args:[String(form.get('sessionId')),workspace.id,String(form.get('candidateId'))]})).rows[0];
  if (!row || !['completed','terminated'].includes(row.status)) return {error:'This interview is unavailable or still in progress.'};
  if (row.dna) { revalidatePath(`/dashboard/candidates/${row.candidate}`); return {success:'Tech DNA is ready.'}; }
  const session = decodeSession(row);
  await updateSession(session,{dna:await analyzeDNA(JSON.parse(row.blueprint),session.transcript)});
  revalidatePath(`/dashboard/candidates/${session.candidate}`);
  return {success:'Tech DNA is ready.'};
  } catch { return {error:'Analysis is temporarily unavailable. Your saved answers are safe. Please retry.'}; }
}
