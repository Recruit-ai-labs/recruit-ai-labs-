'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { canManageJobs, createJobForWorkspace, getJobForWorkspace, setJobStatusForWorkspace, updateJobForWorkspace } from '../../../lib/recruit-data';
import { canTransitionJobStatus, JOB_STATUSES, readJobForm, validateJob } from '../../../lib/job-validation.mjs';
import { requireWorkspace } from '../../../lib/workspace-page';

function denied(membership) {
  return !canManageJobs(membership);
}

export async function createJobAction(_previous, formData) {
  const { workspace, membership, userId } = await requireWorkspace();
  if (denied(membership)) return { error: 'You do not have permission to create jobs.', fieldErrors: {} };
  const data = readJobForm(formData);
  const status = formData.get('intent') === 'publish' ? 'open' : 'draft';
  const validation = validateJob(data, { draft: status === 'draft' });
  if (!validation.valid) return { error: 'Check the highlighted job information.', fieldErrors: validation.errors };
  let job;
  try { job = await createJobForWorkspace({ workspaceId: workspace.id, clerkUserId: userId, data, status }); }
  catch (error) { console.error('Job creation failed:', error?.message); return { error: 'The job could not be saved. Please try again.', fieldErrors: {} }; }
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/jobs');
  redirect(`/dashboard/jobs/${job.id}`);
}

export async function updateJobAction(_previous, formData) {
  const { workspace, membership, userId } = await requireWorkspace();
  if (denied(membership)) return { error: 'You do not have permission to edit jobs.', fieldErrors: {} };
  const jobId = String(formData.get('jobId') || '');
  const existing = await getJobForWorkspace(workspace.id, jobId);
  if (!existing) return { error: 'Job not found in this workspace.', fieldErrors: {} };
  const data = readJobForm(formData);
  const publish = formData.get('intent') === 'publish';
  if (publish && existing.status === 'archived') return { error: 'Restore this job to draft before editing or publishing it.', fieldErrors: {} };
  const validation = validateJob(data, { draft: !publish });
  if (!validation.valid) return { error: 'Check the highlighted job information.', fieldErrors: validation.errors };
  try {
    await updateJobForWorkspace({ workspaceId: workspace.id, clerkUserId: userId, jobId, data: { ...data, status: publish ? 'open' : 'draft', archived_at: '', published_at: publish ? existing.published_at || new Date().toISOString() : '' } });
  } catch (error) { console.error('Job update failed:', error?.message); return { error: 'The job could not be updated. Please try again.', fieldErrors: {} }; }
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/jobs');
  revalidatePath(`/dashboard/jobs/${jobId}`);
  redirect(`/dashboard/jobs/${jobId}`);
}

export async function changeJobStatusAction(formData) {
  const { workspace, membership, userId } = await requireWorkspace();
  if (denied(membership)) return;
  const jobId = String(formData.get('jobId') || '');
  const status = String(formData.get('status') || '');
  if (!JOB_STATUSES.includes(status)) return;
  const job = await getJobForWorkspace(workspace.id, jobId);
  if (!job) return;
  if (!canTransitionJobStatus(job.status, status)) return;
  if (status === 'open') {
    const validation = validateJob(job);
    if (!validation.valid) redirect(`/dashboard/jobs/${jobId}/edit?publishError=1`);
  }
  await setJobStatusForWorkspace({ workspaceId: workspace.id, clerkUserId: userId, jobId, status });
  revalidatePath('/dashboard'); revalidatePath('/dashboard/jobs'); revalidatePath(`/dashboard/jobs/${jobId}`);
}

export async function generateJobContentAction(input) {
  const { membership } = await requireWorkspace();
  if (denied(membership)) return { error: 'You do not have permission to generate job content.' };
  const apiKey = process.env.NVIDIA_NIM_API_KEY, base = (process.env.NVIDIA_NIM_BASE_URL || '').replace(/\/$/, ''), model = process.env.NIM_LLM_MODEL || process.env.NIM_FAST_LLM_MODEL;
  if (!apiKey || !base || !model) return { error: 'AI generation is not configured.' };
  const payload = { title: input.title, department: input.department, location: input.location, workplace_type: input.workplace_type, employment_type: input.employment_type, openings: input.openings, experience: `${input.experience_min}-${input.experience_max} years`, must_have_skills: input.must_have_skills, nice_to_have_skills: input.nice_to_have_skills, knockout_criteria: input.knockout_criteria, priority: input.priority };
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 120000);
  try {
    const response = await fetch(`${base}/chat/completions`, { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, temperature: .25, max_tokens: 1800, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: 'You write concise, inclusive, factual hiring copy. Return JSON only with responsibilities and description. responsibilities: 5-8 clear outcome-focused bullet lines, no markdown heading. description: a structured, candidate-facing job description with short sections for role impact, what you will do, requirements, and working model. Never invent company facts, benefits, salary, visa or legal claims. Use only supplied brief.' }, { role: 'user', content: JSON.stringify(payload) }] }), signal: controller.signal, cache: 'no-store' });
    const body = await response.json().catch(() => null); if (!response.ok) return { error: body?.error?.message || 'AI generation failed.' };
    const content = body?.choices?.[0]?.message?.content || ''; const result = JSON.parse(content.replace(/^```json\s*|\s*```$/g, ''));
    const responsibilities = String(result.responsibilities || '').trim().slice(0, 5000), description = String(result.description || '').trim().slice(0, 8000);
    if (responsibilities.length < 40 || description.length < 80) return { error: 'AI returned incomplete content. Try again.' };
    return { responsibilities, description, model: body.model || model };
  } catch (error) { return { error: error?.name === 'AbortError' ? 'AI generation timed out. Try again.' : 'AI generation could not be completed.' }; } finally { clearTimeout(timer); }
}
