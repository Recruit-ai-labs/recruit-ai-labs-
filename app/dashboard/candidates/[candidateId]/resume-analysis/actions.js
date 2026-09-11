'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { extractStructuredResume, NimResumeError } from '../../../../../lib/nim-resume';
import { extractResumeText, hashResume, ResumeTextError } from '../../../../../lib/resume-text';
import { approveResumeExtraction, canManageCandidates, completeResumeExtraction, createResumeExtraction, failResumeExtraction, getCandidateForWorkspace, getCandidateResumeFile, getLatestResumeExtraction, rejectResumeExtraction } from '../../../../../lib/recruit-data';
import { requireWorkspace } from '../../../../../lib/workspace-page';

const routeFor = (candidateId, notice = '') => `/dashboard/candidates/${encodeURIComponent(candidateId)}/resume-analysis${notice ? `?notice=${notice}` : ''}`;

export async function analyzeResumeAction(formData) {
  const { workspace, membership, userId } = await requireWorkspace();
  const candidateId = String(formData.get('candidateId') || '');
  if (!canManageCandidates(membership)) redirect(routeFor(candidateId, 'forbidden'));
  const candidate = await getCandidateForWorkspace(workspace.id, candidateId);
  if (!candidate) redirect('/dashboard/candidates');
  if (candidate.consent_status === 'withdrawn') redirect(routeFor(candidateId, 'withdrawn'));
  if (formData.get('ai_processing_confirmed') !== 'yes') redirect(routeFor(candidateId, 'confirmation-required'));
  const latest = await getLatestResumeExtraction(workspace.id, candidateId);
  if (latest?.status === 'processing') {
    const stillActive = Date.now() - new Date(latest.created).getTime() < 10 * 60 * 1000;
    if (stillActive) redirect(routeFor(candidateId, 'already-processing'));
    await failResumeExtraction({ workspaceId: workspace.id, candidateId, extractionId: latest.id, clerkUserId: userId, code: 'processing_timeout', message: 'The previous analysis did not finish and can be retried.' });
  }

  let extraction = null;
  const source = await getCandidateResumeFile(workspace.id, candidateId).catch(() => null);
  if (!source) redirect(routeFor(candidateId, 'missing-resume'));
  try {
    extraction = await createResumeExtraction({
      workspaceId: workspace.id, candidateId, clerkUserId: userId, filename: source.filename,
      sha256: hashResume(source.bytes), model: process.env.NIM_LLM_MODEL || process.env.NIM_FAST_LLM_MODEL || 'unconfigured',
    });
    const parsed = await extractResumeText(source.bytes, { filename: source.filename, contentType: source.contentType });
    const result = await extractStructuredResume(parsed.text);
    const allWarnings = [...new Set([...(parsed.warnings || []), ...(result.structured.warnings || [])])].slice(0, 20);
    result.structured.warnings = allWarnings;
    await completeResumeExtraction({
      workspaceId: workspace.id, candidateId, extractionId: extraction.id, clerkUserId: userId,
      structured: result.structured, warnings: allWarnings, inputCharacters: parsed.text.length,
      model: result.model, usage: result.usage,
    });
  } catch (error) {
    if (extraction) {
      const known = error instanceof ResumeTextError || error instanceof NimResumeError;
      await failResumeExtraction({
        workspaceId: workspace.id, candidateId, extractionId: extraction.id, clerkUserId: userId,
        code: known ? error.code : 'analysis_failed', message: known ? error.message : 'Resume analysis could not be completed.',
      }).catch(() => null);
    }
    console.error('Resume analysis failed:', error?.code || error?.name || 'unknown');
    redirect(routeFor(candidateId, 'analysis-failed'));
  }
  revalidatePath(`/dashboard/candidates/${candidateId}`);
  revalidatePath(routeFor(candidateId));
  redirect(routeFor(candidateId, 'analysis-complete'));
}

export async function approveResumeAction(formData) {
  const { workspace, membership, userId } = await requireWorkspace();
  const candidateId = String(formData.get('candidateId') || '');
  if (!canManageCandidates(membership)) redirect(routeFor(candidateId, 'forbidden'));
  const result = await approveResumeExtraction({
    workspaceId: workspace.id, candidateId, extractionId: String(formData.get('extractionId') || ''),
    clerkUserId: userId, fields: formData.getAll('applyField').map(String),
  });
  if (!result) redirect(routeFor(candidateId, 'stale-review'));
  revalidatePath('/dashboard/candidates'); revalidatePath(`/dashboard/candidates/${candidateId}`); revalidatePath(routeFor(candidateId));
  redirect(routeFor(candidateId, 'approved'));
}

export async function rejectResumeAction(formData) {
  const { workspace, membership, userId } = await requireWorkspace();
  const candidateId = String(formData.get('candidateId') || '');
  if (!canManageCandidates(membership)) redirect(routeFor(candidateId, 'forbidden'));
  const result = await rejectResumeExtraction({ workspaceId: workspace.id, candidateId, extractionId: String(formData.get('extractionId') || ''), clerkUserId: userId });
  if (!result) redirect(routeFor(candidateId, 'stale-review'));
  revalidatePath(`/dashboard/candidates/${candidateId}`); revalidatePath(routeFor(candidateId));
  redirect(routeFor(candidateId, 'rejected'));
}
