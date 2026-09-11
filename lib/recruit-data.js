import 'server-only';
import {cookies} from 'next/headers';
import { createRecord, deleteRecord, getRecord, listAllRecords, listRecords, pbFilterValue, pbRawRequest, updateRecord } from './pocketbase';
import { buildResumeProfilePatch } from './resume-review.mjs';

export async function getMembership(clerkUserId) {
  const preferred=(await cookies()).get('recruit-workspace')?.value;
  if(preferred){const selected=await listRecords('memberships',{filter:`clerk_user_id = "${pbFilterValue(clerkUserId)}" && workspace = "${pbFilterValue(preferred)}" && status = "active"`,perPage:1});if(selected.items?.[0])return selected.items[0];}
  const result = await listRecords('memberships', {
    filter: `clerk_user_id = "${pbFilterValue(clerkUserId)}" && status = "active"`,
    perPage: 1,
  });
  return result.items?.[0] || null;
}

export async function getWorkspaceContext(clerkUserId) {
  const membership = await getMembership(clerkUserId);
  if (!membership) return null;
  return { workspace: await getRecord('workspaces', membership.workspace), membership };
}

function makeSlug(name) {
  const core = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 42) || 'workspace';
  return `${core}-${crypto.randomUUID().slice(0, 7)}`;
}

export async function createWorkspaceForUser(input) {
  const existing = await getWorkspaceContext(input.clerkUserId);
  if (existing) return existing;
  const workspace = await createRecord('workspaces', {
    name: input.companyName,
    slug: makeSlug(input.companyName),
    website: input.website || '',
    company_size: input.companySize,
    hiring_goal: input.hiringGoal,
    created_by_clerk_id: input.clerkUserId,
  });
  try {
    const membership = await createRecord('memberships', {
      workspace: workspace.id,
      clerk_user_id: input.clerkUserId,
      email: input.email,
      name: input.name,
      role: 'owner',
      job_function: input.jobFunction,
      status: 'active',
    });
    return { workspace, membership };
  } catch (error) {
    await deleteRecord('workspaces', workspace.id).catch(() => null);
    throw error;
  }
}

export async function getWorkspaceSummary(workspaceId) {
  const filter = `workspace = "${pbFilterValue(workspaceId)}"`;
  const [jobs, candidates, applications, interviews, pools] = await Promise.all([
    listRecords('jobs', { filter, perPage: 1 }),
    listRecords('candidates', { filter, perPage: 1 }),
    listRecords('applications', { filter, perPage: 1 }),
    listRecords('interviews', { filter, perPage: 1 }),
    listRecords('talent_pools', { filter, perPage: 1 }),
  ]);
  return { jobs: jobs.totalItems || 0, candidates: candidates.totalItems || 0, applications: applications.totalItems || 0, interviews: interviews.totalItems || 0, talentPools: pools.totalItems || 0 };
}

export function listWorkspaceRecords(collection, workspaceId, options = {}) {
  return listRecords(collection, {
    filter: `workspace = "${pbFilterValue(workspaceId)}"`,
    perPage: options.perPage || 30,
    page: options.page || 1,
    sort: options.sort,
  });
}

const jobManagers = new Set(['owner', 'admin', 'recruiter']);

export function canManageJobs(membership) {
  return membership?.status === 'active' && jobManagers.has(membership.role);
}

export async function listJobsForWorkspace(workspaceId, { search = '', status = '', page = 1 } = {}) {
  const filters = [`workspace = "${pbFilterValue(workspaceId)}"`];
  if (search) filters.push(`title ~ "${pbFilterValue(search)}"`);
  if (status && ['draft', 'open', 'paused', 'closed', 'archived'].includes(status)) filters.push(`status = "${status}"`);
  return listRecords('jobs', { filter: filters.join(' && '), sort: '-updated', perPage: 50, page });
}

export async function getJobForWorkspace(workspaceId, jobId) {
  const result = await listRecords('jobs', {
    filter: `id = "${pbFilterValue(jobId)}" && workspace = "${pbFilterValue(workspaceId)}"`,
    perPage: 1,
  });
  return result.items?.[0] || null;
}

async function recordActivity({ workspaceId, clerkUserId, jobId, action, metadata = {} }) {
  await createRecord('activities', {
    workspace: workspaceId, actor_clerk_user_id: clerkUserId, entity_type: 'job',
    entity_id: jobId, action, metadata,
  }).catch((error) => console.error('Activity recording failed:', error?.message));
}

export async function createJobForWorkspace({ workspaceId, clerkUserId, data, status }) {
  const now = new Date().toISOString();
  const job = await createRecord('jobs', {
    ...data, workspace: workspaceId, created_by_clerk_id: clerkUserId, status,
    published_at: status === 'open' ? now : '', archived_at: '',
    pipeline_stages: ['new', 'screening', 'interview', 'assessment', 'offer', 'hired', 'rejected'],
  });
  await recordActivity({ workspaceId, clerkUserId, jobId: job.id, action: 'job.created', metadata: { status } });
  return job;
}

export async function updateJobForWorkspace({ workspaceId, clerkUserId, jobId, data }) {
  const current = await getJobForWorkspace(workspaceId, jobId);
  if (!current) return null;
  const job = await updateRecord('jobs', jobId, data);
  await recordActivity({ workspaceId, clerkUserId, jobId, action: 'job.updated' });
  return job;
}

export async function setJobStatusForWorkspace({ workspaceId, clerkUserId, jobId, status }) {
  const current = await getJobForWorkspace(workspaceId, jobId);
  if (!current) return null;
  const now = new Date().toISOString();
  const patch = { status };
  if (status === 'open' && !current.published_at) patch.published_at = now;
  if (status === 'archived') patch.archived_at = now;
  if (status !== 'archived' && current.archived_at) patch.archived_at = '';
  const job = await updateRecord('jobs', jobId, patch);
  await recordActivity({ workspaceId, clerkUserId, jobId, action: 'job.status_changed', metadata: { from: current.status, to: status } });
  return job;
}

export function listJobApplications(workspaceId, jobId) {
  return listRecords('applications', {
    filter: `workspace = "${pbFilterValue(workspaceId)}" && job = "${pbFilterValue(jobId)}"`,
    sort: '-updated', perPage: 50,
  });
}

export function listJobActivities(workspaceId, jobId) {
  return listRecords('activities', {
    filter: `workspace = "${pbFilterValue(workspaceId)}" && entity_type = "job" && entity_id = "${pbFilterValue(jobId)}"`,
    sort: '-created', perPage: 20,
  });
}

const candidateManagers = new Set(['owner', 'admin', 'recruiter']);

export function canManageCandidates(membership) {
  return membership?.status === 'active' && candidateManagers.has(membership.role);
}

export async function listCandidatesForWorkspace(workspaceId, { search = '', status = '', source = '', page = 1 } = {}) {
  const filters = [`workspace = "${pbFilterValue(workspaceId)}"`];
  if (search) {
    const value = pbFilterValue(search);
    filters.push(`(first_name ~ "${value}" || last_name ~ "${value}" || email ~ "${value}" || current_title ~ "${value}")`);
  }
  if (['active', 'do-not-contact', 'archived'].includes(status)) filters.push(`status = "${status}"`);
  if (['manual', 'referral', 'career-site', 'import', 'sourced'].includes(source)) filters.push(`source = "${source}"`);
  return listRecords('candidates', { filter: filters.join(' && '), sort: '-updated', perPage: 50, page });
}

export async function getCandidateForWorkspace(workspaceId, candidateId) {
  const result = await listRecords('candidates', {
    filter: `id = "${pbFilterValue(candidateId)}" && workspace = "${pbFilterValue(workspaceId)}"`, perPage: 1,
  });
  return result.items?.[0] || null;
}

export async function findCandidateByEmail(workspaceId, email, excludeId = '') {
  const filters = [`workspace = "${pbFilterValue(workspaceId)}"`, `email = "${pbFilterValue(email.toLowerCase())}"`];
  if (excludeId) filters.push(`id != "${pbFilterValue(excludeId)}"`);
  const result = await listRecords('candidates', { filter: filters.join(' && '), perPage: 1 });
  return result.items?.[0] || null;
}

function candidateFormData({ workspaceId, clerkUserId, data, resume }) {
  const form = new FormData();
  const values = {
    workspace: workspaceId, created_by_clerk_id: clerkUserId, owner_clerk_user_id: clerkUserId,
    first_name: data.first_name, last_name: data.last_name, preferred_name: data.preferred_name,
    email: data.email, phone: data.phone, location: data.location, current_title: data.current_title,
    current_company: data.current_company, linkedin_url: data.linkedin_url, portfolio_url: data.portfolio_url,
    total_experience: data.total_experience ?? '', notice_period_days: data.notice_period_days ?? '',
    source: data.source, skills: JSON.stringify(data.skills), summary: data.summary,
    consent_status: data.consent_status, consent_at: data.consent_status === 'obtained' ? new Date().toISOString() : '',
    resume_parse_status: 'not-started', status: data.consent_status === 'withdrawn' ? 'do-not-contact' : 'active',
  };
  Object.entries(values).forEach(([key, value]) => form.set(key, String(value)));
  if (resume?.size) form.set('resume', resume, resume.name);
  return form;
}

async function recordCandidateActivity({ workspaceId, clerkUserId, candidateId, action, metadata = {} }) {
  await createRecord('activities', { workspace: workspaceId, actor_clerk_user_id: clerkUserId, entity_type: 'candidate', entity_id: candidateId, action, metadata }).catch((error) => console.error('Candidate activity recording failed:', error?.message));
}

export async function createCandidateForWorkspace({ workspaceId, clerkUserId, data, resume }) {
  const candidate = await createRecord('candidates', candidateFormData({ workspaceId, clerkUserId, data, resume }));
  await recordCandidateActivity({ workspaceId, clerkUserId, candidateId: candidate.id, action: 'candidate.created', metadata: { source: data.source } });
  return candidate;
}

export async function updateCandidateForWorkspace({ workspaceId, clerkUserId, candidateId, data, resume }) {
  const current = await getCandidateForWorkspace(workspaceId, candidateId);
  if (!current) return null;
  const form = candidateFormData({ workspaceId, clerkUserId: current.created_by_clerk_id, data, resume });
  form.delete('status');
  if (!resume?.size) {
    form.delete('resume');
    form.delete('resume_parse_status');
  }
  if (data.consent_status === current.consent_status) form.delete('consent_at');
  const candidate = await updateRecord('candidates', candidateId, form);
  await recordCandidateActivity({ workspaceId, clerkUserId, candidateId, action: 'candidate.updated' });
  return candidate;
}

export async function setCandidateStatusForWorkspace({ workspaceId, clerkUserId, candidateId, status }) {
  const current = await getCandidateForWorkspace(workspaceId, candidateId);
  if (!current) return null;
  const patch = { status };
  if (status === 'do-not-contact') patch.consent_status = current.consent_status === 'withdrawn' ? 'withdrawn' : current.consent_status;
  const candidate = await updateRecord('candidates', candidateId, patch);
  await recordCandidateActivity({ workspaceId, clerkUserId, candidateId, action: 'candidate.status_changed', metadata: { from: current.status, to: status } });
  return candidate;
}

export async function attachCandidateToJob({ workspaceId, clerkUserId, candidateId, jobId }) {
  const [candidate, job] = await Promise.all([getCandidateForWorkspace(workspaceId, candidateId), getJobForWorkspace(workspaceId, jobId)]);
  if (!candidate || !job) return null;
  const existing = await listRecords('applications', { filter: `workspace = "${pbFilterValue(workspaceId)}" && candidate = "${pbFilterValue(candidateId)}" && job = "${pbFilterValue(jobId)}"`, perPage: 1 });
  if (existing.items?.[0]) return existing.items[0];
  const now = new Date().toISOString();
  const application = await createRecord('applications', { workspace: workspaceId, job: jobId, candidate: candidateId, stage: 'new', status: 'active', owner_clerk_user_id: clerkUserId, applied_at: now, last_activity_at: now });
  await recordCandidateActivity({ workspaceId, clerkUserId, candidateId, action: 'candidate.added_to_job', metadata: { jobId } });
  return application;
}

export function listCandidateApplications(workspaceId, candidateId) {
  return listRecords('applications', { filter: `workspace = "${pbFilterValue(workspaceId)}" && candidate = "${pbFilterValue(candidateId)}"`, sort: '-updated', perPage: 50 });
}

export function listCandidateActivities(workspaceId, candidateId) {
  return listRecords('activities', { filter: `workspace = "${pbFilterValue(workspaceId)}" && entity_type = "candidate" && entity_id = "${pbFilterValue(candidateId)}"`, sort: '-created', perPage: 20 });
}

export async function getCandidateResumeFile(workspaceId, candidateId) {
  const candidate = await getCandidateForWorkspace(workspaceId, candidateId);
  if (!candidate?.resume) return null;
  const filename = Array.isArray(candidate.resume) ? candidate.resume[0] : candidate.resume;
  const response = await pbRawRequest(`/api/files/candidates/${encodeURIComponent(candidate.id)}/${encodeURIComponent(filename)}`);
  return { candidate, filename, contentType: response.headers.get('content-type') || '', bytes: await response.arrayBuffer() };
}

export async function getResumeExtractionForWorkspace(workspaceId, candidateId, extractionId) {
  const result = await listRecords('resume_extractions', {
    filter: `id = "${pbFilterValue(extractionId)}" && workspace = "${pbFilterValue(workspaceId)}" && candidate = "${pbFilterValue(candidateId)}"`, perPage: 1,
  });
  return result.items?.[0] || null;
}

export async function getLatestResumeExtraction(workspaceId, candidateId) {
  const result = await listRecords('resume_extractions', {
    filter: `workspace = "${pbFilterValue(workspaceId)}" && candidate = "${pbFilterValue(candidateId)}"`, sort: '-created', perPage: 1,
  });
  return result.items?.[0] || null;
}

export async function createResumeExtraction({ workspaceId, candidateId, clerkUserId, filename, sha256, model }) {
  const extraction = await createRecord('resume_extractions', {
    workspace: workspaceId, candidate: candidateId, requested_by_clerk_id: clerkUserId,
    provider: 'nvidia-nim', model, source_filename: filename, source_sha256: sha256,
    status: 'processing', structured_data: null, warnings: [], input_characters: 0,
  });
  await updateRecord('candidates', candidateId, { resume_parse_status: 'pending' });
  await recordCandidateActivity({ workspaceId, clerkUserId, candidateId, action: 'candidate.resume_analysis_started', metadata: { extractionId: extraction.id } });
  return extraction;
}

export async function completeResumeExtraction({ workspaceId, candidateId, extractionId, clerkUserId, structured, warnings, inputCharacters, model, usage }) {
  const extraction = await getResumeExtractionForWorkspace(workspaceId, candidateId, extractionId);
  if (!extraction || extraction.status !== 'processing') return null;
  const updated = await updateRecord('resume_extractions', extractionId, {
    status: 'completed', structured_data: structured, warnings, input_characters: inputCharacters,
    model, prompt_tokens: usage?.promptTokens || 0, completion_tokens: usage?.completionTokens || 0,
    error_code: '', error_message: '',
  });
  await updateRecord('candidates', candidateId, { resume_parse_status: 'completed' });
  await recordCandidateActivity({ workspaceId, clerkUserId, candidateId, action: 'candidate.resume_analysis_completed', metadata: { extractionId } });
  return updated;
}

export async function failResumeExtraction({ workspaceId, candidateId, extractionId, clerkUserId, code, message }) {
  const extraction = await getResumeExtractionForWorkspace(workspaceId, candidateId, extractionId);
  if (!extraction || extraction.status !== 'processing') return null;
  const updated = await updateRecord('resume_extractions', extractionId, { status: 'failed', error_code: code, error_message: String(message || 'Resume analysis failed.').slice(0, 500) });
  await updateRecord('candidates', candidateId, { resume_parse_status: 'failed' });
  await recordCandidateActivity({ workspaceId, clerkUserId, candidateId, action: 'candidate.resume_analysis_failed', metadata: { extractionId, code } });
  return updated;
}

export async function approveResumeExtraction({ workspaceId, candidateId, extractionId, clerkUserId, fields }) {
  const [candidate, extraction] = await Promise.all([
    getCandidateForWorkspace(workspaceId, candidateId), getResumeExtractionForWorkspace(workspaceId, candidateId, extractionId),
  ]);
  if (!candidate || !extraction || extraction.status !== 'completed') return null;
  const { selected, patch } = buildResumeProfilePatch(candidate, extraction.structured_data, fields);
  if (Object.keys(patch).length) await updateRecord('candidates', candidateId, patch);
  const reviewedAt = new Date().toISOString();
  const updated = await updateRecord('resume_extractions', extractionId, { status: 'approved', reviewed_by_clerk_id: clerkUserId, reviewed_at: reviewedAt, applied_fields: selected });
  await recordCandidateActivity({ workspaceId, clerkUserId, candidateId, action: 'candidate.resume_analysis_approved', metadata: { extractionId, appliedFields: selected } });
  return updated;
}

export async function rejectResumeExtraction({ workspaceId, candidateId, extractionId, clerkUserId }) {
  const extraction = await getResumeExtractionForWorkspace(workspaceId, candidateId, extractionId);
  if (!extraction || extraction.status !== 'completed') return null;
  const updated = await updateRecord('resume_extractions', extractionId, { status: 'rejected', reviewed_by_clerk_id: clerkUserId, reviewed_at: new Date().toISOString(), applied_fields: [] });
  await recordCandidateActivity({ workspaceId, clerkUserId, candidateId, action: 'candidate.resume_analysis_rejected', metadata: { extractionId } });
  return updated;
}

export async function getApplicationForWorkspace(workspaceId, jobId, candidateId) {
  const result = await listRecords('applications', { filter: `workspace = "${pbFilterValue(workspaceId)}" && job = "${pbFilterValue(jobId)}" && candidate = "${pbFilterValue(candidateId)}"`, perPage: 1 });
  return result.items?.[0] || null;
}

export async function getApprovedResumeExtraction(workspaceId, candidateId) {
  const result = await listRecords('resume_extractions', { filter: `workspace = "${pbFilterValue(workspaceId)}" && candidate = "${pbFilterValue(candidateId)}" && status = "approved"`, sort: '-created', perPage: 1 });
  return result.items?.[0] || null;
}

export async function getLatestCandidateJobEvaluation(workspaceId, jobId, candidateId) {
  const result = await listRecords('candidate_job_evaluations', { filter: `workspace = "${pbFilterValue(workspaceId)}" && job = "${pbFilterValue(jobId)}" && candidate = "${pbFilterValue(candidateId)}"`, sort: '-created', perPage: 1 });
  return result.items?.[0] || null;
}

export async function getCandidateJobEvaluation(workspaceId, jobId, candidateId, evaluationId) {
  const result = await listRecords('candidate_job_evaluations', { filter: `id = "${pbFilterValue(evaluationId)}" && workspace = "${pbFilterValue(workspaceId)}" && job = "${pbFilterValue(jobId)}" && candidate = "${pbFilterValue(candidateId)}"`, perPage: 1 });
  return result.items?.[0] || null;
}

export async function createCandidateJobEvaluation({ workspaceId, jobId, candidateId, applicationId, clerkUserId, jobFingerprint, candidateFingerprint, model }) {
  const evaluation = await createRecord('candidate_job_evaluations', { workspace: workspaceId, job: jobId, candidate: candidateId, application: applicationId, requested_by_clerk_id: clerkUserId, provider: 'nvidia-nim', model, job_fingerprint: jobFingerprint, candidate_fingerprint: candidateFingerprint, status: 'processing', warnings: [], review_decision: 'pending' });
  await recordCandidateActivity({ workspaceId, clerkUserId, candidateId, action: 'candidate.job_evaluation_started', metadata: { jobId, evaluationId: evaluation.id } });
  return evaluation;
}

export async function completeCandidateJobEvaluation({ workspaceId, jobId, candidateId, evaluationId, clerkUserId, evaluation, model, usage }) {
  const current = await getCandidateJobEvaluation(workspaceId, jobId, candidateId, evaluationId); if (!current || current.status !== 'processing') return null;
  const updated = await updateRecord('candidate_job_evaluations', evaluationId, { status: 'completed', evaluation_data: evaluation, overall_score: evaluation.overall_score, recommendation: evaluation.recommendation, confidence: evaluation.confidence, warnings: evaluation.warnings, model, prompt_tokens: usage?.promptTokens || 0, completion_tokens: usage?.completionTokens || 0 });
  await recordCandidateActivity({ workspaceId, clerkUserId, candidateId, action: 'candidate.job_evaluation_completed', metadata: { jobId, evaluationId, score: evaluation.overall_score } });
  return updated;
}

export async function failCandidateJobEvaluation({ workspaceId, jobId, candidateId, evaluationId, clerkUserId, code, message }) {
  const current = await getCandidateJobEvaluation(workspaceId, jobId, candidateId, evaluationId); if (!current || current.status !== 'processing') return null;
  const updated = await updateRecord('candidate_job_evaluations', evaluationId, { status: 'failed', error_code: code, error_message: String(message || 'Evaluation failed.').slice(0, 500) });
  await recordCandidateActivity({ workspaceId, clerkUserId, candidateId, action: 'candidate.job_evaluation_failed', metadata: { jobId, evaluationId, code } });
  return updated;
}

export async function reviewCandidateJobEvaluation({ workspaceId, jobId, candidateId, evaluationId, clerkUserId, decision, note }) {
  if (!['advance', 'hold', 'reject'].includes(decision)) return null;
  const current = await getCandidateJobEvaluation(workspaceId, jobId, candidateId, evaluationId); if (!current || current.status !== 'completed') return null;
  const updated = await updateRecord('candidate_job_evaluations', evaluationId, { review_decision: decision, review_note: String(note || '').trim().slice(0, 1000), reviewed_by_clerk_id: clerkUserId, reviewed_at: new Date().toISOString() });
  await recordCandidateActivity({ workspaceId, clerkUserId, candidateId, action: 'candidate.job_evaluation_reviewed', metadata: { jobId, evaluationId, decision } });
  return updated;
}

export const APPLICATION_STAGES = ['new', 'screening', 'interview', 'assessment', 'offer', 'hired', 'rejected'];
export async function updateApplicationPipeline({ workspaceId, applicationId, clerkUserId, stage, status, nextAction, nextActionAt, note }) {
  const result = await listRecords('applications', { filter: `id = "${pbFilterValue(applicationId)}" && workspace = "${pbFilterValue(workspaceId)}"`, perPage: 1 });
  const current = result.items?.[0]; if (!current || !APPLICATION_STAGES.includes(stage)) return null;
  const patch = { stage, status: status || (stage === 'hired' ? 'hired' : stage === 'rejected' ? 'rejected' : 'active'), owner_clerk_user_id: clerkUserId, last_activity_at: new Date().toISOString(), stage_changed_at: current.stage === stage ? current.stage_changed_at : new Date().toISOString() };
  if (nextAction !== undefined) patch.next_action = String(nextAction).trim().slice(0, 300);
  if (nextActionAt !== undefined) patch.next_action_at = nextActionAt || '';
  if (note?.trim()) patch.notes = [...(Array.isArray(current.notes) ? current.notes : []), { text: String(note).trim().slice(0, 1000), author: clerkUserId, created: new Date().toISOString() }].slice(-50);
  const updated = await updateRecord('applications', applicationId, patch);
  await createRecord('activities', { workspace: workspaceId, actor_clerk_user_id: clerkUserId, entity_type: 'application', entity_id: applicationId, action: current.stage === stage ? 'application.updated' : 'application.stage_changed', metadata: { from: current.stage, to: stage, nextAction: patch.next_action || '' } }).catch(() => null);
  return updated;
}
