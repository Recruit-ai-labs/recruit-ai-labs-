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

const env = loadEnv();
const base = (env.POCKETBASE_URL || env.NEXT_PUBLIC_POCKETBASE_URL || '').replace(/\/$/, '');

async function authenticate() {
  const response = await fetch(`${base}/api/collections/_superusers/auth-with-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identity: env.POCKETBASE_ADMIN_EMAIL, password: env.POCKETBASE_ADMIN_PASSWORD }) });
  assert.equal(response.status, 200); return (await response.json()).token;
}

test('candidate ingestion, resume storage, duplicate protection and application lifecycle', async () => {
  const token = await authenticate();
  const jsonHeaders = { Authorization: token, 'Content-Type': 'application/json' };
  const fixture = `candidate-integration-${crypto.randomUUID()}`;
  let workspaceId, otherWorkspaceId, jobId, candidateId, applicationId;
  const request = (path, options = {}) => fetch(`${base}${path}`, { ...options, headers: { ...jsonHeaders, ...options.headers } });
  try {
    let response = await request('/api/collections/workspaces/records', { method: 'POST', body: JSON.stringify({ name: 'Candidate Integration Workspace', slug: fixture, company_size: '1-10', hiring_goal: 'build-team', created_by_clerk_id: fixture }) });
    assert.equal(response.status, 200); workspaceId = (await response.json()).id;
    response = await request('/api/collections/workspaces/records', { method: 'POST', body: JSON.stringify({ name: 'Candidate Isolation Workspace', slug: `${fixture}-other`, company_size: '1-10', hiring_goal: 'build-team', created_by_clerk_id: fixture }) });
    assert.equal(response.status, 200); otherWorkspaceId = (await response.json()).id;
    response = await request('/api/collections/jobs/records', { method: 'POST', body: JSON.stringify({ workspace: workspaceId, created_by_clerk_id: fixture, title: 'Candidate Test Role', status: 'open' }) });
    assert.equal(response.status, 200); jobId = (await response.json()).id;

    const form = new FormData();
    const fields = { workspace: workspaceId, created_by_clerk_id: fixture, owner_clerk_user_id: fixture, first_name: 'Integration', last_name: 'Candidate', email: `${fixture}@example.com`, source: 'referral', skills: JSON.stringify(['JavaScript']), consent_status: 'obtained', consent_at: new Date().toISOString(), resume_parse_status: 'not-started', status: 'active' };
    Object.entries(fields).forEach(([key, value]) => form.set(key, value));
    form.set('resume', new Blob(['%PDF-1.4\n% integration fixture\n'], { type: 'application/pdf' }), 'resume.pdf');
    response = await fetch(`${base}/api/collections/candidates/records`, { method: 'POST', headers: { Authorization: token }, body: form });
    assert.equal(response.status, 200); const candidate = await response.json(); candidateId = candidate.id;
    assert.equal(candidate.email, `${fixture}@example.com`); assert.ok(candidate.resume); assert.ok(candidate.created);

    response = await request('/api/collections/candidates/records', { method: 'POST', body: JSON.stringify({ ...fields, first_name: 'Duplicate' }) });
    assert.equal(response.status, 400, 'workspace/email unique index must reject duplicates');

    const filename = Array.isArray(candidate.resume) ? candidate.resume[0] : candidate.resume;
    const anonymousFile=await fetch(`${base}/api/files/candidates/${candidateId}/${filename}`);assert.equal(anonymousFile.status,404,'Resume must not be downloadable anonymously');
    const fileTokenResponse=await fetch(`${base}/api/files/token`,{method:'POST',headers:{Authorization:token}});const fileToken=await fileTokenResponse.json();
    response = await fetch(`${base}/api/files/candidates/${candidateId}/${filename}?token=${fileToken.token}`);
    assert.equal(response.status, 200); assert.match(await response.text(), /^%PDF-/);

    const isolationFilter = encodeURIComponent(`id = "${candidateId}" && workspace = "${otherWorkspaceId}"`);
    response = await request(`/api/collections/candidates/records?page=1&perPage=1&filter=${isolationFilter}`);
    assert.equal(response.status, 200); assert.equal((await response.json()).totalItems, 0);

    response = await request('/api/collections/applications/records', { method: 'POST', body: JSON.stringify({ workspace: workspaceId, job: jobId, candidate: candidateId, stage: 'new', status: 'active', owner_clerk_user_id: fixture, applied_at: new Date().toISOString(), last_activity_at: new Date().toISOString() }) });
    assert.equal(response.status, 200); applicationId = (await response.json()).id;
    response = await request(`/api/collections/candidates/records/${candidateId}`, { method: 'PATCH', body: JSON.stringify({ current_title: 'Senior Engineer', status: 'do-not-contact' }) });
    assert.equal(response.status, 200); const updated = await response.json(); assert.equal(updated.current_title, 'Senior Engineer'); assert.equal(updated.status, 'do-not-contact');

    const publicResponse = await fetch(`${base}/api/collections/candidates/records?page=1&perPage=1`);
    assert.ok([401, 403, 404].includes(publicResponse.status));
    response = await request('/api/collections/interviews/records', { method: 'POST', body: JSON.stringify({ workspace: workspaceId, job: jobId, candidate: candidateId, application: applicationId, title: 'Deletion fixture', interview_type: 'technical', status: 'scheduled' }) });
    assert.equal(response.status, 200); const interviewId = (await response.json()).id;
    response = await request('/api/collections/scorecards/records', { method: 'POST', body: JSON.stringify({ workspace: workspaceId, interview: interviewId, application: applicationId, reviewer_clerk_user_id: fixture }) });
    assert.equal(response.status, 200); const scorecardId = (await response.json()).id;
    response = await request(`/api/collections/candidates/records/${candidateId}`, { method: 'DELETE' });
    assert.equal(response.status, 204);
    for (const [collection, id] of [['candidates', candidateId], ['applications', applicationId], ['interviews', interviewId], ['scorecards', scorecardId]]) {
      assert.equal((await request(`/api/collections/${collection}/records/${id}`)).status, 404, `${collection} must be removed with candidate`);
    }
    assert.equal((await request(`/api/collections/jobs/records/${jobId}`)).status, 200, 'Deleting a candidate must preserve the job');
    assert.equal((await fetch(`${base}/api/files/candidates/${candidateId}/${filename}?token=${fileToken.token}`)).status, 404, 'Deleted resume must no longer be accessible');
  } finally {
    if (applicationId) await request(`/api/collections/applications/records/${applicationId}`, { method: 'DELETE' }).catch(() => null);
    if (candidateId) await request(`/api/collections/candidates/records/${candidateId}`, { method: 'DELETE' }).catch(() => null);
    if (jobId) await request(`/api/collections/jobs/records/${jobId}`, { method: 'DELETE' }).catch(() => null);
    if (workspaceId) await request(`/api/collections/workspaces/records/${workspaceId}`, { method: 'DELETE' }).catch(() => null);
    if (otherWorkspaceId) await request(`/api/collections/workspaces/records/${otherWorkspaceId}`, { method: 'DELETE' }).catch(() => null);
  }
});
