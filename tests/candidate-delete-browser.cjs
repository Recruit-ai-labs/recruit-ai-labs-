const { build } = require('./ui-interactions.cjs');
const http = require('node:http'), fs = require('node:fs'), assert = require('node:assert/strict');
async function main() {
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const bundle = build(`import React from 'react';import {createRoot} from 'react-dom/client';import DeleteCandidate from './app/dashboard/candidates/DeleteCandidate';createRoot(document.getElementById('root')).render(<DeleteCandidate candidateId="test-candidate" candidateName="Aarav Sharma"/>);`);
  const css = fs.readFileSync('app/theme.css', 'utf8');
  const server = http.createServer((req, res) => { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{font-family:Arial}${css}</style><div id="root"></div><script>${bundle.replaceAll('</script', '<\\/script')}</script>`); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.getByRole('button', { name: 'Delete candidate', exact: true }).click();
    await page.getByRole('dialog').waitFor();
    assert(await page.getByRole('button', { name: 'Cancel', exact: true }).evaluate(el => el === document.activeElement));
    await page.getByRole('button', { name: 'Delete permanently', exact: true }).click();
    assert.equal(await page.evaluate(() => window.deleteSubmitted), undefined);
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    assert.equal(await page.getByRole('dialog').count(), 0);
    await page.getByRole('button', { name: 'Delete candidate', exact: true }).click();
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Delete permanently', exact: true }).click();
    await page.getByRole('alert').waitFor();
    assert.deepEqual(await page.evaluate(() => window.deleteSubmitted), { candidateId: 'test-candidate', confirmed: 'yes' });
    assert(await page.getByRole('dialog').isVisible());
    const size = await page.getByRole('dialog').boundingBox();
    assert(size.x >= 0 && size.x + size.width <= 390);
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').count(), 0);
    assert.deepEqual(errors, []);
    console.log('PASS candidate deletion: confirmation, cancel, keyboard dismissal, error recovery and mobile dialog');
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
