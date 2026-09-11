import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { transformSync } = require('next/dist/build/swc');
function load(fetch) {
  const code = transformSync(fs.readFileSync(new URL('../lib/pocketbase.js', import.meta.url), 'utf8'), { jsc: { target: 'es2020', parser: { syntax: 'ecmascript' } }, module: { type: 'commonjs' } }).code;
  const module = { exports: {} };
  const timeouts = [];
  const signals = { any: AbortSignal.any.bind(AbortSignal), timeout(ms) { timeouts.push(ms); return AbortSignal.timeout(25); } };
  new Function('require', 'module', 'exports', 'fetch', 'process', 'AbortSignal', code)(() => ({}), module, module.exports, fetch, { env: { POCKETBASE_URL: 'http://test.invalid', POCKETBASE_ADMIN_EMAIL: 'test@example.com', POCKETBASE_ADMIN_PASSWORD: 'test' } }, signals);
  return { ...module.exports, timeouts };
}
const response = (payload, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => payload });
test('concurrent page requests share authentication and request only required fields', async () => {
  let authCalls = 0;
  const urls = [];
  const api = load(async (url, options) => {
    assert(options.signal instanceof AbortSignal);
    if (url.endsWith('auth-with-password')) { authCalls++; await new Promise(resolve => setTimeout(resolve, 5)); return response({ token: 'test-token' }); }
    urls.push(url); return response({ items: [], totalItems: 15 });
  });
  const results = await Promise.all(Array.from({ length: 10 }, () => api.listRecords('jobs', { perPage: 1, fields: 'id' })));
  assert.equal(authCalls, 1);
  assert(results.every(result => result.totalItems === 15));
  assert(urls.every(url => new URL(url).searchParams.get('fields') === 'id'));
  assert(api.timeouts.every(ms => ms === 12000));
});
test('stalled database request times out instead of leaving the page loading', async () => {
  const api = load(async (url, options) => {
    if (url.endsWith('auth-with-password')) return response({ token: 'test-token' });
    return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true }));
  });
  const keepAlive = setTimeout(() => {}, 2000);
  try { await assert.rejects(api.listRecords('jobs'), { name: 'TimeoutError' }); }
  finally { clearTimeout(keepAlive); }
});
test('failed authentication can retry and an expired token is refreshed only once', async () => {
  let authCalls = 0, dataCalls = 0;
  const api = load(async url => {
    if (url.endsWith('auth-with-password')) { authCalls++; return response(authCalls === 1 ? {} : { token: 'token' }, authCalls === 1 ? 503 : 200); }
    dataCalls++; return response({ items: [], totalItems: 0 }, dataCalls === 1 ? 401 : 200);
  });
  await assert.rejects(api.listRecords('jobs'), /Unable to authenticate/);
  await api.listRecords('jobs');
  assert.equal(authCalls, 3);
  assert.equal(dataCalls, 2);
});
