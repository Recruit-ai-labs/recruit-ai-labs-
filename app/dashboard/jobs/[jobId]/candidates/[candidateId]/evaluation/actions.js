'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { candidateEvidenceCorpus, fingerprint } from '../../../../../../../lib/match-evaluation.mjs';
import { evaluateCandidateJob } from '../../../../../../../lib/nim-match';
import { NimResumeError } from '../../../../../../../lib/nim-resume';
import { canManageCandidates, completeCandidateJobEvaluation, createCandidateJobEvaluation, failCandidateJobEvaluation, getApplicationForWorkspace, getApprovedResumeExtraction, getCandidateForWorkspace, getJobForWorkspace, getLatestCandidateJobEvaluation, reviewCandidateJobEvaluation } from '../../../../../../../lib/recruit-data';
import { requireWorkspace } from '../../../../../../../lib/workspace-page';

const route = (jobId, candidateId, notice = '') => `/dashboard/jobs/${encodeURIComponent(jobId)}/candidates/${encodeURIComponent(candidateId)}/evaluation${notice ? `?notice=${notice}` : ''}`;
const jobInput = (job) => ({ title: job.title, description: job.description, responsibilities: job.responsibilities, experience_min: job.experience_min, experience_max: job.experience_max, must_have_skills: job.must_have_skills || [], nice_to_have_skills: job.nice_to_have_skills || [], knockout_criteria: job.knockout_criteria || [] });
const candidateInput = (candidate, extraction) => ({ source_sha256: extraction.source_sha256, extraction: extraction.structured_data, profile: { current_title: candidate.current_title, current_company: candidate.current_company, total_experience: candidate.total_experience, skills: candidate.skills, summary: candidate.summary } });

export async function runMatchEvaluationAction(formData) {
  const { workspace, membership, userId } = await requireWorkspace(); const jobId = String(formData.get('jobId') || ''); const candidateId = String(formData.get('candidateId') || '');
  if (!canManageCandidates(membership)) redirect(route(jobId, candidateId, 'forbidden'));
  const [job, candidate, application, extraction] = await Promise.all([getJobForWorkspace(workspace.id, jobId), getCandidateForWorkspace(workspace.id, candidateId), getApplicationForWorkspace(workspace.id, jobId, candidateId), getApprovedResumeExtraction(workspace.id, candidateId)]);
  if (!job || !candidate || !application) redirect(`/dashboard/jobs/${jobId}`);
  if (!extraction) redirect(route(jobId, candidateId, 'analysis-required'));
  if (['draft', 'archived'].includes(job.status)) redirect(route(jobId, candidateId, 'job-not-ready'));
  const latest = await getLatestCandidateJobEvaluation(workspace.id, jobId, candidateId);
  if (latest?.status === 'processing') { if (Date.now() - new Date(latest.created).getTime() < 10 * 60 * 1000) redirect(route(jobId, candidateId, 'already-processing')); await failCandidateJobEvaluation({ workspaceId: workspace.id, jobId, candidateId, evaluationId: latest.id, clerkUserId: userId, code: 'processing_timeout', message: 'The previous evaluation did not finish and can be retried.' }); }
  const evidenceCorpus = candidateEvidenceCorpus(candidate, extraction); let record;
  try {
    record = await createCandidateJobEvaluation({ workspaceId: workspace.id, jobId, candidateId, applicationId: application.id, clerkUserId: userId, jobFingerprint: fingerprint(jobInput(job)), candidateFingerprint: fingerprint(candidateInput(candidate, extraction)), model: process.env.NIM_LLM_MODEL || process.env.NIM_FAST_LLM_MODEL || 'unconfigured' });
    const result = await evaluateCandidateJob({ job, candidate, extraction, evidenceCorpus });
    await completeCandidateJobEvaluation({ workspaceId: workspace.id, jobId, candidateId, evaluationId: record.id, clerkUserId: userId, evaluation: result.evaluation, model: result.model, usage: result.usage });
  } catch (error) {
    if (record) await failCandidateJobEvaluation({ workspaceId: workspace.id, jobId, candidateId, evaluationId: record.id, clerkUserId: userId, code: error instanceof NimResumeError ? error.code : 'evaluation_failed', message: error instanceof NimResumeError ? error.message : 'Candidate evaluation could not be completed.' }).catch(() => null);
    console.error('Candidate-job evaluation failed:', error?.code || error?.name || 'unknown'); redirect(route(jobId, candidateId, 'evaluation-failed'));
  }
  revalidatePath(`/dashboard/jobs/${jobId}`); revalidatePath(route(jobId, candidateId)); redirect(route(jobId, candidateId, 'evaluation-complete'));
}

export async function reviewMatchEvaluationAction(formData) {
  const { workspace, membership, userId } = await requireWorkspace(); const jobId = String(formData.get('jobId') || ''); const candidateId = String(formData.get('candidateId') || '');
  if (!canManageCandidates(membership)) redirect(route(jobId, candidateId, 'forbidden'));
  const result = await reviewCandidateJobEvaluation({ workspaceId: workspace.id, jobId, candidateId, evaluationId: String(formData.get('evaluationId') || ''), clerkUserId: userId, decision: String(formData.get('decision') || ''), note: String(formData.get('note') || '') });
  if (!result) redirect(route(jobId, candidateId, 'stale-review'));
  revalidatePath(`/dashboard/jobs/${jobId}`); revalidatePath(route(jobId, candidateId)); redirect(route(jobId, candidateId, 'review-saved'));
}
