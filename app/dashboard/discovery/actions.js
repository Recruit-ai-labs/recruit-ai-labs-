'use server';
import { requireWorkspace } from '../../../lib/workspace-page';
import { canManageCandidates } from '../../../lib/recruit-data';
import { normalizeBrief, normalizeEntity, clean } from '../../../lib/discovery-core.mjs';
import { parseDiscoveryJD, discoverWebLeads, analyzeTechDNA } from '../../../lib/discovery-provider.mjs';
import {requireUsage,recordUsage} from '../../../lib/usage-entitlements';

const requests = new Map();
function limit(userId, action, interval = 5000) {
  const key = `${userId}:${action}`, now = Date.now();
  if ((requests.get(key) || 0) > now) throw new Error('Please wait a few seconds before trying again.');
  if (requests.size > 1000) for (const [k, expiry] of requests) if (expiry < now) requests.delete(k);
  requests.set(key, now + interval);
}
async function context() {
  const ctx = await requireWorkspace();
  if (!canManageCandidates(ctx.membership)) throw new Error('Only workspace owners, admins and recruiters can run discovery.');
  return ctx;
}
function errorResult(error) {
  return { error: error?.name === 'TimeoutError' ? 'The provider timed out. Retry or continue with manual fields.' : error?.name === 'PocketBaseError' ? 'The workspace could not be updated. Check the connection and retry.' : error?.message || 'Discovery could not finish. Retry.' };
}

export async function parseDiscoveryAction(formData) {
  const ctx = await context();
  try {
    limit(ctx.userId, 'parse');
    let text = String(formData.get('text') || '');
    const file = formData.get('file');
    if (file && typeof file.arrayBuffer === 'function' && file.size) {
      if (file.size > 750000) throw new Error('JD files must be 750 KB or smaller. You can paste text instead.');
      if (/\.txt$/i.test(file.name)) text = await file.text();
      else {
        if (!/\.(pdf|docx)$/i.test(file.name)) throw new Error('Upload a TXT, PDF or DOCX job description.');
        const { extractResumeText } = await import('../../../lib/resume-text');
        const result = await extractResumeText(await file.arrayBuffer(), { filename: file.name, contentType: file.type });
        text = result.text;
      }
    }
    return await parseDiscoveryJD(text);
  } catch (error) { return errorResult(error); }
}

export async function runDiscoveryAction(input) {
  const ctx = await context();
  try {
    limit(ctx.userId, 'search', 8000);
    await requireUsage(ctx.workspace.id, 'discovery');
    const brief = normalizeBrief(input?.brief);
    const location = clean(input?.location, 160);
    if (location.length < 2) throw new Error('Enter a location to search.');
    const entity = normalizeEntity({ name: location, type: 'city' });
    const web = await discoverWebLeads(brief, entity);
    await recordUsage({workspace:ctx.workspace.id,userId:ctx.userId,feature:'discovery'});
    return { web, brief, location, searchedAt: new Date().toISOString() };
  } catch (error) { return errorResult(error); }
}

export async function analyzeTechDNAAction(input) {
  const ctx = await context();
  try {
    limit(ctx.userId, 'tech-dna', 3000);
    return await analyzeTechDNA({ linkedin: input?.linkedin, name: input?.name, brief: input?.brief });
  } catch (error) { return errorResult(error); }
}
