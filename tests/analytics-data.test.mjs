import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { transformSync } = require('next/dist/build/swc');
function load(listRecords) {
  const code = transformSync(fs.readFileSync(new URL('../lib/analytics-data.js', import.meta.url), 'utf8'), { jsc: { target: 'es2020', parser: { syntax: 'ecmascript' } }, module: { type: 'commonjs' } }).code;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(() => ({ listRecords, pbFilterValue: value => String(value).replaceAll('"', '\\"') }), module, module.exports);
  return module.exports.getAnalyticsData;
}
test('analytics uses exact database totals with minimal payloads and workspace isolation', async () => {
  const calls = [];
  const read = load(async (collection, options) => {
    calls.push({ collection, ...options });
    return { items: [{ id: 'one-preview-record' }], totalItems: 1000 };
  });
  const result = await read('workspace-one');
  assert.equal(result.openRoles, 1000);
  assert.equal(result.active, 5000);
  assert.equal(result.total, 7000);
  assert.equal(result.hired, 1000);
  assert.equal(result.conversion, 14);
  assert(calls.every(call => call.filter.startsWith('workspace = "workspace-one" && (')));
  assert(calls.every(call => call.perPage === 1 && call.fields === 'id' && !call.page));
  for (const call of calls.filter(call => call.filter.includes('stage ='))) {
    assert.match(call.filter, /status != "withdrawn"/);
    if (!/stage = "(hired|rejected)"/.test(call.filter)) assert.match(call.filter, /status = "active"/);
  }
  assert.equal(result.sourceCounts.at(-1).source, 'other');
});
test('analytics handles an empty workspace and propagates unavailable data', async () => {
  const result = await load(async () => ({ items: [], totalItems: 0 }))('empty');
  assert.equal(result.conversion, 0);
  assert.equal(result.active, 0);
  await assert.rejects(load(async () => { throw new Error('Timed out'); })('w'), /Timed out/);
});
