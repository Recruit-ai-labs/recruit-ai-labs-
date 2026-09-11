// Isolated local PocketBase fixtures. Does not modify existing recruiting records.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { discoverCandidates } from '../lib/discovery-core.mjs';
const require = createRequire(import.meta.url), { transformSync } = require('next/dist/build/swc');
const base = process.env.POCKETBASE_URL || process.env.NEXT_PUBLIC_POCKETBASE_URL;
assert.ok(base && ['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Integration fixtures require a local PocketBase.');
const auth = await fetch(`${base}/api/collections/_superusers/auth-with-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identity: process.env.POCKETBASE_ADMIN_EMAIL, password: process.env.POCKETBASE_ADMIN_PASSWORD }), signal: AbortSignal.timeout(10000) });
assert.equal(auth.status, 200); const token = (await auth.json()).token;
async function request(path, method = 'GET', data) {
  const response = await fetch(`${base}${path}`, { method, headers: { Authorization: token, 'Content-Type': 'application/json' }, body: data ? JSON.stringify(data) : undefined, signal: AbortSignal.timeout(10000) });
  const result = response.status === 204 ? null : await response.json();
  assert.ok(response.ok, `${method} ${path}: ${response.status}`); return result;
}
const create = (collection, data) => request(`/api/collections/${collection}/records`, 'POST', data);
const reader = (collection, options) => request(`/api/collections/${collection}/records?${new URLSearchParams(Object.fromEntries(Object.entries(options).map(([k,v]) => [k, String(v)])))}`);
const deps = { discoverCandidates, listRecords: reader, pbFilterValue: value => String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"') };
const module = { exports: {} };
const code = transformSync(fs.readFileSync(new URL('../lib/discovery-data.js', import.meta.url), 'utf8'), { jsc: { target: 'es2020', parser: { syntax: 'ecmascript' } }, module: { type: 'commonjs' } }).code;
new Function('require', 'module', 'exports', code)(() => deps, module, module.exports);
const fixture = `discovery-${crypto.randomUUID()}`, workspaces = [];
try {
  for (const suffix of ['main', 'other']) workspaces.push(await create('workspaces', { name: 'Discovery test ' + suffix, slug: `${fixture}-${suffix}`, company_size: '1-10', hiring_goal: 'build-team', created_by_clerk_id: fixture }));
  const [workspace, other] = workspaces;
  const person = (id, name, extra = {}) => create('candidates', { workspace: id, first_name: name, email: `${name}-${fixture}@example.com`, status: 'active', source: 'manual', consent_status: 'obtained', created_by_clerk_id: fixture, ...extra });
  const maya = await person(workspace.id, 'Maya', { skills: ['React', 'JavaScript'], location: 'Bengaluru' });
  await person(workspace.id, 'Arun');
  await person(workspace.id, 'Withdrawn', { consent_status: 'withdrawn', skills: ['React', 'JavaScript'] });
  await person(other.id, 'OtherWorkspace', { skills: ['React', 'JavaScript'], location: 'Bengaluru' });
  await create('resume_extractions', { workspace: workspace.id, candidate: maya.id, requested_by_clerk_id: fixture, provider: 'test-fixture', model: 'fixture', source_filename: 'fixture.pdf', source_sha256: 'a'.repeat(64), status: 'approved', structured_data: { education: [{ institution: 'Example Institute' }], skills: [{ name: 'React', evidence: 'Built a React interface.' }] } });
  const brief = { title: 'Frontend Developer', required: ['React', 'JavaScript'], preferred: [], minExperience: null };
  const result = await module.exports.loadDiscoveryCandidates(workspace.id, brief, { name: 'Bengaluru', type: 'city', aliases: [], location: '' });
  assert.equal(result.total, 2); assert.equal(result.scanned, 2); assert.equal(result.partial, false);
  assert.deepEqual(result.candidates.map(c => c.name).sort(), ['Arun', 'Maya']);
  assert.equal(result.candidates.find(c => c.name === 'Maya').lane, 'documented');
  assert.equal(result.candidates.find(c => c.name === 'Arun').lane, 'needs-evidence');
  const activity = await create('activities', { workspace: workspace.id, actor_clerk_user_id: fixture, entity_type: 'workspace', entity_id: workspace.id, action: 'discovery.search_saved', metadata: { version: 1, name: 'Test search', brief, entity: null } });
  const loaded = await reader('activities', { filter: `workspace = "${workspace.id}" && action = "discovery.search_saved"`, perPage: 12 });
  assert.equal(loaded.items[0].id, activity.id); assert.deepEqual(loaded.items[0].metadata.brief, brief);
  const publicRead = await fetch(`${base}/api/collections/candidates/records`, { signal: AbortSignal.timeout(10000) });
  assert.ok([401, 403, 404].includes(publicRead.status));
  console.log('PASS live PocketBase: isolated discovery, reviewed evidence, missing-evidence lane, consent exclusion, saved-search persistence and anonymous access restriction.');
} finally {
  for (const workspace of workspaces) await request(`/api/collections/workspaces/records/${workspace.id}`, 'DELETE');
  console.log('Removed isolated discovery fixtures.');
}
