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
  const response = await fetch(`${base}/api/collections/_superusers/auth-with-password`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: env.POCKETBASE_ADMIN_EMAIL, password: env.POCKETBASE_ADMIN_PASSWORD }),
  });
  assert.equal(response.status, 200, 'PocketBase superuser authentication failed');
  return (await response.json()).token;
}

test('job persistence lifecycle and workspace isolation', async () => {
  assert.ok(base, 'POCKETBASE_URL is required');
  const token = await authenticate();
  const headers = { Authorization: token, 'Content-Type': 'application/json' };
  const fixture = `integration-${crypto.randomUUID()}`;
  let workspaceId;
  let otherWorkspaceId;
  let jobId;
  const request = (path, options = {}) => fetch(`${base}${path}`, { ...options, headers: { ...headers, ...options.headers } });

  try {
    let response = await request('/api/collections/workspaces/records', { method: 'POST', body: JSON.stringify({ name: 'Integration Test Workspace', slug: fixture, company_size: '1-10', hiring_goal: 'build-team', created_by_clerk_id: fixture }) });
    assert.equal(response.status, 200); workspaceId = (await response.json()).id;
    response = await request('/api/collections/workspaces/records', { method: 'POST', body: JSON.stringify({ name: 'Isolation Workspace', slug: `${fixture}-other`, company_size: '1-10', hiring_goal: 'build-team', created_by_clerk_id: fixture }) });
    assert.equal(response.status, 200); otherWorkspaceId = (await response.json()).id;

    const job = { workspace: workspaceId, created_by_clerk_id: fixture, title: 'Integration Test Role', department: 'Engineering', location: 'Remote, India', workplace_type: 'remote', employment_type: 'full-time', openings: 1, experience_min: 2, experience_max: 5, must_have_skills: ['JavaScript'], nice_to_have_skills: [], knockout_criteria: [], pipeline_stages: ['new', 'screening', 'interview', 'offer', 'hired', 'rejected'], priority: 'normal', responsibilities: 'Own reliable product delivery and collaborate with the wider engineering team.', description: 'This isolated integration fixture verifies the complete persistence lifecycle for a structured Recruit AI hiring role.', currency: 'INR', status: 'draft' };
    response = await request('/api/collections/jobs/records', { method: 'POST', body: JSON.stringify(job) });
    assert.equal(response.status, 200); const created = await response.json(); jobId = created.id;
    assert.equal(created.status, 'draft'); assert.ok(created.created); assert.ok(created.updated);

    response = await request(`/api/collections/jobs/records/${jobId}`);
    assert.equal(response.status, 200); assert.equal((await response.json()).title, job.title);

    const isolationFilter = encodeURIComponent(`id = "${jobId}" && workspace = "${otherWorkspaceId}"`);
    response = await request(`/api/collections/jobs/records?page=1&perPage=1&filter=${isolationFilter}`);
    assert.equal(response.status, 200); assert.equal((await response.json()).totalItems, 0);

    response = await request(`/api/collections/jobs/records/${jobId}`, { method: 'PATCH', body: JSON.stringify({ status: 'open', published_at: new Date().toISOString() }) });
    assert.equal(response.status, 200); assert.equal((await response.json()).status, 'open');
    response = await request(`/api/collections/jobs/records/${jobId}`, { method: 'PATCH', body: JSON.stringify({ status: 'paused' }) });
    assert.equal(response.status, 200); assert.equal((await response.json()).status, 'paused');
    response = await request(`/api/collections/jobs/records/${jobId}`, { method: 'PATCH', body: JSON.stringify({ status: 'archived', archived_at: new Date().toISOString() }) });
    assert.equal(response.status, 200); assert.equal((await response.json()).status, 'archived');

    const publicResponse = await fetch(`${base}/api/collections/jobs/records?page=1&perPage=1`);
    assert.ok([401, 403, 404].includes(publicResponse.status), 'Jobs collection must not be publicly readable');
  } finally {
    if (jobId) await request(`/api/collections/jobs/records/${jobId}`, { method: 'DELETE' }).catch(() => null);
    if (workspaceId) await request(`/api/collections/workspaces/records/${workspaceId}`, { method: 'DELETE' }).catch(() => null);
    if (otherWorkspaceId) await request(`/api/collections/workspaces/records/${otherWorkspaceId}`, { method: 'DELETE' }).catch(() => null);
  }
});
