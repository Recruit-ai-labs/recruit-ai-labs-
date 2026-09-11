import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function loadEnv() {
  const values = {};
  for (const line of fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match) values[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
  return values;
}

const env = loadEnv(); const base = (env.POCKETBASE_URL || env.NEXT_PUBLIC_POCKETBASE_URL || '').replace(/\/$/, '');

test('resume extraction persistence, processing guard, review and isolation lifecycle', async () => {
  const authResponse = await fetch(`${base}/api/collections/_superusers/auth-with-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identity: env.POCKETBASE_ADMIN_EMAIL, password: env.POCKETBASE_ADMIN_PASSWORD }) });
  assert.equal(authResponse.status, 200); const token = (await authResponse.json()).token;
  const headers = { Authorization: token, 'Content-Type': 'application/json' };
  const request = (path, options = {}) => fetch(`${base}${path}`, { ...options, headers: { ...headers, ...options.headers } });
  const fixture = `resume-analysis-${crypto.randomUUID()}`; let workspaceId, otherWorkspaceId, candidateId, extractionId;
  try {
    let response = await request('/api/collections/workspaces/records', { method: 'POST', body: JSON.stringify({ name: 'Resume Analysis Test', slug: fixture, company_size: '1-10', hiring_goal: 'improve-quality', created_by_clerk_id: fixture }) });
    assert.equal(response.status, 200); workspaceId = (await response.json()).id;
    response = await request('/api/collections/workspaces/records', { method: 'POST', body: JSON.stringify({ name: 'Other Resume Workspace', slug: `${fixture}-other`, company_size: '1-10', hiring_goal: 'build-team', created_by_clerk_id: fixture }) });
    assert.equal(response.status, 200); otherWorkspaceId = (await response.json()).id;
    response = await request('/api/collections/candidates/records', { method: 'POST', body: JSON.stringify({ workspace: workspaceId, created_by_clerk_id: fixture, owner_clerk_user_id: fixture, first_name: 'Aarav', last_name: 'Sharma', email: `${fixture}@example.com`, source: 'manual', consent_status: 'obtained', resume_parse_status: 'pending', status: 'active', skills: [] }) });
    assert.equal(response.status, 200); candidateId = (await response.json()).id;
    const processing = { workspace: workspaceId, candidate: candidateId, requested_by_clerk_id: fixture, provider: 'nvidia-nim', model: 'integration-model', source_filename: 'resume.pdf', source_sha256: 'a'.repeat(64), status: 'processing', warnings: [], input_characters: 0 };
    response = await request('/api/collections/resume_extractions/records', { method: 'POST', body: JSON.stringify(processing) });
    assert.equal(response.status, 200); extractionId = (await response.json()).id;
    response = await request('/api/collections/resume_extractions/records', { method: 'POST', body: JSON.stringify({ ...processing, source_sha256: 'b'.repeat(64) }) });
    assert.equal(response.status, 400, 'only one processing extraction may exist per candidate');
    const structured = { candidate: { full_name: 'Aarav Sharma', current_title: 'Senior Engineer', current_company: 'Northstar', total_experience_years: 5, summary: 'Builds reliable products.' }, skills: [{ name: 'TypeScript', evidence: 'Skills: TypeScript', confidence: .95 }], experience: [], education: [], certifications: [], warnings: [], overall_confidence: .9 };
    response = await request(`/api/collections/resume_extractions/records/${extractionId}`, { method: 'PATCH', body: JSON.stringify({ status: 'completed', structured_data: structured, input_characters: 420, prompt_tokens: 120, completion_tokens: 80 }) });
    assert.equal(response.status, 200); assert.equal((await response.json()).structured_data.candidate.current_title, 'Senior Engineer');
    const isolationFilter = encodeURIComponent(`id = "${extractionId}" && workspace = "${otherWorkspaceId}"`);
    response = await request(`/api/collections/resume_extractions/records?page=1&perPage=1&filter=${isolationFilter}`);
    assert.equal(response.status, 200); assert.equal((await response.json()).totalItems, 0);
    response = await request(`/api/collections/resume_extractions/records/${extractionId}`, { method: 'PATCH', body: JSON.stringify({ status: 'approved', reviewed_by_clerk_id: fixture, reviewed_at: new Date().toISOString(), applied_fields: ['current_title', 'skills'] }) });
    assert.equal(response.status, 200); const approved = await response.json(); assert.equal(approved.status, 'approved'); assert.deepEqual(approved.applied_fields, ['current_title', 'skills']);
    const publicResponse = await fetch(`${base}/api/collections/resume_extractions/records?page=1&perPage=1`);
    assert.ok([401, 403, 404].includes(publicResponse.status));
  } finally {
    if (extractionId) await request(`/api/collections/resume_extractions/records/${extractionId}`, { method: 'DELETE' }).catch(() => null);
    if (candidateId) await request(`/api/collections/candidates/records/${candidateId}`, { method: 'DELETE' }).catch(() => null);
    if (workspaceId) await request(`/api/collections/workspaces/records/${workspaceId}`, { method: 'DELETE' }).catch(() => null);
    if (otherWorkspaceId) await request(`/api/collections/workspaces/records/${otherWorkspaceId}`, { method: 'DELETE' }).catch(() => null);
  }
});
