// Read-only smoke checks against the configured local services.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { transformSync } = require('next/dist/build/swc');
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const code = transformSync(fs.readFileSync(file, 'utf8'), { jsc: { target: 'es2020', parser: { syntax: 'ecmascript' } }, module: { type: 'commonjs' } }).code;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(spec => spec === 'server-only' ? {} : load(path.resolve(path.dirname(file), `${spec}.js`)), module, module.exports);
  cache.set(file, module.exports); return module.exports;
}
async function main() {
  const { getDashboardData } = load(path.resolve(__dirname, '../lib/dashboard-data.js'));
  const { listRecords } = load(path.resolve(__dirname, '../lib/pocketbase.js'));
  const workspaces = await listRecords('workspaces', { perPage: 1 });
  const workspace = workspaces.items[0];
  const data = await getDashboardData(workspace?.id || 'nonexistent0000');
  assert.equal(data.pipeline.length, 7);
  console.log('PASS real PocketBase dashboard filters and counts');
  const { getAnalyticsData } = load(path.resolve(__dirname, '../lib/analytics-data.js'));
  const started = Date.now();
  const analytics = await getAnalyticsData(workspace?.id || 'nonexistent0000');
  assert.equal(analytics.stages.length, 7);
  assert.equal(analytics.active, data.activeApplications);
  assert.equal(analytics.openRoles, data.jobs.totalItems);
  console.log(`PASS real PocketBase analytics: ${Date.now() - started}ms, totals agree with dashboard`);
  if (process.argv.includes('--data-only')) return;
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage(); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const response = await page.goto('http://localhost:3002/sign-in', { waitUntil: 'domcontentloaded' });
    assert.equal(response.status(), 200);
    await page.waitForFunction(() => !!window.Clerk?.loaded, { timeout: 45000 });
    console.log('Sign-in controls:', await page.locator('input').evaluateAll(items => items.map(item => ({ type: item.type, name: item.name }))));
    console.log('Sign-in buttons:', await page.getByRole('button').allTextContents());
    await page.screenshot({ path: 'D:/Temp/dashboard-login-check.png', fullPage: true });
    await page.goto('http://localhost:3002/dashboard');
    await page.waitForURL(/sign-in/);
    console.log('PASS sign-in loads and unauthenticated dashboard redirects to sign-in');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
