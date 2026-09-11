// Opt-in: uses configured hosted APIs on public place queries and a synthetic JD only.
import assert from 'node:assert/strict';
import { discoveryCapabilities, resolveDiscoveryEntity, parseDiscoveryJD, discoverWebLeads, searchWeb } from '../lib/discovery-provider.mjs';
const capabilities = discoveryCapabilities();
console.log('Configured providers:', capabilities);
assert.ok(capabilities.ai && capabilities.web, 'Live smoke test needs configured NIM and Serper credentials.');
if (process.argv.includes('--sources')) {
  for (const query of ['Bengaluru', 'SSIPMT']) console.log(JSON.stringify({ query, sources: await searchWeb(query) }));
  process.exit(0);
}
const failures = [];
let parsed = { brief: { title: 'Frontend Developer', required: ['React', 'JavaScript'], preferred: ['Azure'], minExperience: null } };
try {
  parsed = await parseDiscoveryJD('We are hiring a Frontend Developer. Required skills: React and JavaScript. Azure is preferred. Build accessible web interfaces and work with the product team. No minimum years of experience is required.');
  assert.ok(parsed.brief.required.length > 0);
  console.log('JD parsing:', JSON.stringify({ ...parsed.brief, model: parsed.model }));
} catch (error) { failures.push('JD parsing: ' + error.message); console.log(failures.at(-1)); }
for (const query of ['Bengaluru', 'SSIPMT']) {
  try {
  const resolved = await resolveDiscoveryEntity(query);
  console.log('Scope resolution:', query, JSON.stringify({ entities: resolved.entities.map(e => ({ name: e.name, type: e.type, location: e.location, source: e.source })), sourceCount: resolved.sources.length, message: resolved.message }));
  assert.ok(resolved.sources.length > 0, 'Search should return real public sources.');
  assert.ok(resolved.entities.length > 0, 'At least one interpretation should pass source validation.');
  assert.ok(resolved.entities.some(e => e.type === (query === 'SSIPMT' ? 'institution' : 'city')), 'Resolver must identify the queried entity rather than substitute its host city.');
  } catch (error) { failures.push(query + ': ' + error.message); console.log(failures.at(-1)); }
}
const web = await discoverWebLeads(parsed.brief, { name: 'Bengaluru', type: 'city', aliases: ['Bangalore'] });
console.log('Public search:', JSON.stringify({ complete: web.complete, leadCount: web.leads.length, channels: web.searches.map(s => ({ channel: s.channel, count: s.count, error: s.error })) }));
assert.ok(web.complete, 'All search channels should complete.');
if (failures.length) { console.log('Incomplete live checks:', JSON.stringify(failures)); process.exitCode = 1; }
else console.log('Live provider smoke checks passed. Search leads are unverified; this is not a candidate-quality benchmark.');
