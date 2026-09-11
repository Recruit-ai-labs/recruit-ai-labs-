'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { attachCandidateToJob, canManageCandidates, createCandidateForWorkspace, findCandidateByEmail, getCandidateForWorkspace, getJobForWorkspace, setCandidateStatusForWorkspace, updateCandidateForWorkspace } from '../../../lib/recruit-data';
import { canTransitionCandidateStatus, CANDIDATE_STATUSES, matchesResumeSignature, readCandidateForm, validateCandidate, validateResume } from '../../../lib/candidate-validation.mjs';
import { requireWorkspace } from '../../../lib/workspace-page';
import { deleteRecord } from '../../../lib/pocketbase';

export async function deleteCandidateAction(_previous, formData) {
  const { workspace, membership } = await requireWorkspace();
  if (!canManageCandidates(membership)) return { error: 'You do not have permission to delete candidates.' };
  const candidateId = String(formData.get('candidateId') || '');
  if (formData.get('confirmed') !== 'yes') return { error: 'Confirm permanent deletion before continuing.' };
  try {
    const candidate = await getCandidateForWorkspace(workspace.id, candidateId);
    if (!candidate) return { error: 'Candidate not found in this workspace.' };
    // PocketBase cascades linked applications, interviews, scorecards and files.
    await deleteRecord('candidates', candidate.id);
  } catch (error) {
    console.error('Candidate deletion failed:', error?.message);
    return { error: 'The candidate could not be deleted. Please try again.' };
  }
  revalidatePath('/dashboard', 'layout');
  redirect('/dashboard/candidates?deleted=1');
}

async function validateResumeContent(file) {
  const basic = validateResume(file);
  if (!basic.valid || !file?.size) return basic;
  const bytes = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  return matchesResumeSignature(bytes, file.type) ? { valid: true } : { valid: false, error: 'The resume content does not match its PDF or DOCX file type.' };
}

export async function createCandidateAction(_previous, formData) {
  const { workspace, membership, userId } = await requireWorkspace();
  if (!canManageCandidates(membership)) return { error: 'You do not have permission to add candidates.', fieldErrors: {} };
  const data = readCandidateForm(formData);
  const validation = validateCandidate(data);
  const resume = formData.get('resume');
  const fileValidation = await validateResumeContent(resume);
  if (!fileValidation.valid) validation.errors.resume = fileValidation.error;
  if (data.job_id && !(await getJobForWorkspace(workspace.id, data.job_id))) validation.errors.job_id = 'Select a job from this workspace.';
  validation.valid = Object.keys(validation.errors).length === 0;
  if (!validation.valid) return { error: 'Check the highlighted candidate information.', fieldErrors: validation.errors };
  const duplicate = await findCandidateByEmail(workspace.id, data.email);
  if (duplicate) return { error: 'A candidate with this email already exists in the workspace.', fieldErrors: { email: 'Duplicate email address.' }, duplicateId: duplicate.id };
  let candidate;
  try {
    candidate = await createCandidateForWorkspace({ workspaceId: workspace.id, clerkUserId: userId, data, resume });
    if (data.job_id) await attachCandidateToJob({ workspaceId: workspace.id, clerkUserId: userId, candidateId: candidate.id, jobId: data.job_id });
  } catch (error) {
    console.error('Candidate creation failed:', error?.message);
    return { error: 'The candidate could not be saved. Check the file and try again.', fieldErrors: {} };
  }
  revalidatePath('/dashboard'); revalidatePath('/dashboard/candidates'); revalidatePath('/dashboard/jobs');
  redirect(`/dashboard/candidates/${candidate.id}`);
}

export async function updateCandidateAction(_previous, formData) {
  const { workspace, membership, userId } = await requireWorkspace();
  if (!canManageCandidates(membership)) return { error: 'You do not have permission to edit candidates.', fieldErrors: {} };
  const candidateId = String(formData.get('candidateId') || '');
  const current = await getCandidateForWorkspace(workspace.id, candidateId);
  if (!current) return { error: 'Candidate not found in this workspace.', fieldErrors: {} };
  const data = readCandidateForm(formData);
  const validation = validateCandidate(data);
  const resume = formData.get('resume');
  const fileValidation = await validateResumeContent(resume);
  if (!fileValidation.valid) validation.errors.resume = fileValidation.error;
  validation.valid = Object.keys(validation.errors).length === 0;
  if (!validation.valid) return { error: 'Check the highlighted candidate information.', fieldErrors: validation.errors };
  const duplicate = await findCandidateByEmail(workspace.id, data.email, candidateId);
  if (duplicate) return { error: 'Another candidate already uses this email.', fieldErrors: { email: 'Duplicate email address.' }, duplicateId: duplicate.id };
  try {
    await updateCandidateForWorkspace({ workspaceId: workspace.id, clerkUserId: userId, candidateId, data, resume });
    if (data.consent_status === 'withdrawn' && current.status !== 'do-not-contact') await setCandidateStatusForWorkspace({ workspaceId: workspace.id, clerkUserId: userId, candidateId, status: 'do-not-contact' });
  }
  catch (error) { console.error('Candidate update failed:', error?.message); return { error: 'The candidate could not be updated.', fieldErrors: {} }; }
  revalidatePath('/dashboard/candidates'); revalidatePath(`/dashboard/candidates/${candidateId}`);
  redirect(`/dashboard/candidates/${candidateId}`);
}

export async function changeCandidateStatusAction(formData) {
  const { workspace, membership, userId } = await requireWorkspace();
  if (!canManageCandidates(membership)) return;
  const candidateId = String(formData.get('candidateId') || '');
  const status = String(formData.get('status') || '');
  if (!CANDIDATE_STATUSES.includes(status)) return;
  const current = await getCandidateForWorkspace(workspace.id, candidateId);
  if (!current || current.status === status) return;
  if (!canTransitionCandidateStatus(current.status, status)) return;
  if (status === 'active' && current.consent_status === 'withdrawn') return;
  await setCandidateStatusForWorkspace({ workspaceId: workspace.id, clerkUserId: userId, candidateId, status });
  revalidatePath('/dashboard/candidates'); revalidatePath(`/dashboard/candidates/${candidateId}`);
}
