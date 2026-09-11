import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { transformSync } = require('next/dist/build/swc');
function load(listRecords) {
  const source = fs.readFileSync(new URL('../lib/dashboard-data.js', import.meta.url), 'utf8');
  const code = transformSync(source, { jsc: { target: 'es2020', parser: { syntax: 'ecmascript' } }, module: { type: 'commonjs' } }).code;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(() => ({ listRecords, pbFilterValue: value => String(value).replaceAll('"', '\\"') }), module, module.exports);
  return module.exports.getDashboardData;
}
test('dashboard scopes every query and counts the full pipeline beyond preview limits', async () => {
  const calls = [];
  const read = load(async (collection, options) => {
    calls.push({ collection, ...options });
    return { items: [], totalItems: collection === 'applications' ? 120 : 34 };
  });
  const result = await read('workspace-one', new Date('2026-09-09T12:00:00Z'));
  assert.equal(result.activeApplications, 600);
  assert.equal(result.jobs.totalItems, 34);
  assert.equal(result.pipeline.length, 7);
  assert(calls.every(call => call.filter.startsWith('workspace = "workspace-one" && (')));
  assert(calls.every(call => call.perPage <= 5));
  assert.match(calls.find(call => call.collection === 'jobs').filter, /status = "open"/);
  assert.match(calls.find(call => call.collection === 'candidates').filter, /status = "active"/);
  const upcoming = calls.find(call => call.sort === 'starts_at');
  assert.match(upcoming.filter, /status = "scheduled" && starts_at >= "2026-09-09 12:00:00.000Z"/);
  for (const call of calls.filter(call => call.collection === 'applications')) {
    assert.match(call.filter, /status != "withdrawn"/);
    if (!/stage = "(hired|rejected)"/.test(call.filter)) assert.match(call.filter, /status = "active"/);
  }
});
test('empty dashboard has zero counts and database failures are not disguised as empty data', async () => {
  const result = await load(async () => ({ items: [], totalItems: 0 }))('empty');
  assert.equal(result.activeApplications, 0);
  assert(result.pipeline.every(item => item.count === 0));
  await assert.rejects(load(async () => { throw new Error('Database unavailable'); })('w'), /Database unavailable/);
});
