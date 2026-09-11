import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { normalizeBrief, normalizeEntity, clean, discoverCandidates } from '../lib/discovery-core.mjs';
const require = createRequire(import.meta.url);
const { transformSync } = require('next/dist/build/swc');
const ctx = { workspace: { id: 'workspace000001' }, membership: { role: 'owner', status: 'active' }, userId: 'test-user' };
const brief = { title: 'Engineer', required: ['React'], preferred: [], minExperience: null };
function load(file, overrides = {}) {
  const deps = { normalizeBrief, normalizeEntity, clean, discoverCandidates, requireWorkspace: async () => ctx, canManageCandidates: m => m.status === 'active' && ['owner', 'admin', 'recruiter'].includes(m.role), pbFilterValue: v => String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"'), listRecords: async () => ({ items: [], totalItems: 0, totalPages: 1 }), requireUsage: async () => ({}), recordUsage: async () => ({}), revalidatePath: () => {}, ...overrides };
  const code = transformSync(fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8'), { jsc: { target: 'es2020', parser: { syntax: 'ecmascript' } }, module: { type: 'commonjs' } }).code;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(() => deps, module, module.exports);
  return module.exports;
}
test('discovery requires an active recruiter role before providers or storage are touched', async () => {
  for (const membership of [{ role: 'interviewer', status: 'active' }, { role: 'owner', status: 'disabled' }]) {
    const actions = load('app/dashboard/discovery/actions.js', { requireWorkspace: async () => ({ ...ctx, membership }), discoverWebLeads: () => assert.fail('Unexpected external call') });
    await assert.rejects(actions.runDiscoveryAction({ brief }), /Only workspace/);
  }
});
test('discovery is web-only and uses the submitted location without accepting a workspace override', async () => {
  let providerInput;
  const actions = load('app/dashboard/discovery/actions.js', { discoverWebLeads: async (b, entity) => { providerInput = { b, entity }; return { leads: [], searches: [], complete: true }; } });
  const response = await actions.runDiscoveryAction({ workspaceId: 'victim', brief, location: ' Bengaluru ' });
  assert.equal(providerInput.entity.name, 'Bengaluru'); assert.equal(providerInput.entity.type, 'city');
  assert.equal(response.location, 'Bengaluru'); assert.equal('workspace' in response, false);
});
test('malformed brief is rejected before scanning or calling providers', async () => {
  const actions = load('app/dashboard/discovery/actions.js', { loadDiscoveryCandidates: () => assert.fail('Unexpected scan') });
  assert.match((await actions.runDiscoveryAction({ brief: {} })).error, /role title/);
});
test('discovery scans multiple pages, scopes all reads and reports bounded coverage', async () => {
  const { loadDiscoveryCandidates } = load('lib/discovery-data.js');
  const calls = [];
  const reader = async (collection, options) => {
    calls.push({ collection, ...options });
    assert.match(options.filter, /workspace = "workspace000001"/);
    if (collection === 'resume_extractions') return { items: [], totalPages: 1 };
    return { items: Array.from({ length: 200 }, (_, i) => ({ id: `${options.page}-${i}`, first_name: 'Fixture', status: 'active', skills: [] })), totalItems: 1200, totalPages: 6 };
  };
  const result = await loadDiscoveryCandidates(ctx.workspace.id, brief, null, reader);
  assert.equal(result.scanned, 1000); assert.equal(result.total, 1200); assert.equal(result.partial, true);
  assert.equal(calls.filter(c => c.collection === 'candidates').length, 5);
  assert.ok(calls.filter(c => c.collection === 'resume_extractions').every(c => c.filter.includes('candidate =')));
});
test('failed resume reads are surfaced as incomplete evidence', async () => {
  const { loadDiscoveryCandidates } = load('lib/discovery-data.js');
  const result = await loadDiscoveryCandidates(ctx.workspace.id, brief, null, async collection => {
    if (collection === 'resume_extractions') throw Error('offline');
    return { items: [{ id: 'c', first_name: 'Candidate', status: 'active', skills: ['React'] }], totalItems: 1, totalPages: 1 };
  });
  assert.equal(result.partial, true); assert.ok(result.warnings.length); assert.equal(result.candidates.length, 1);
});
