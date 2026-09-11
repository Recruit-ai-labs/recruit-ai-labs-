const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const { build } = require('./ui-interactions.cjs');
const fixture = { openRoles: 12, active: 116, hired: 9, conversion: 6, total: 139, withdrawn: 3,
  stages: ['new', 'screening', 'interview', 'assessment', 'offer', 'hired', 'rejected'].map((stage, i) => ({ stage, count: [48, 32, 18, 12, 6, 9, 14][i] })),
  interviewCounts: ['scheduled', 'completed', 'cancelled', 'no-show'].map((status, i) => ({ status, count: [8, 16, 2, 1][i] })),
  sourceCounts: [{ source: 'manual', count: 21 }, { source: 'referral', count: 12 }] };
const source = `import React from 'react';import {createRoot} from 'react-dom/client';import AppShell from './app/dashboard/components/AppShell';import AnalyticsOverview from './app/dashboard/components/AnalyticsOverview';import AnalyticsError from './app/dashboard/analytics/error';import AnalyticsLoading from './app/dashboard/analytics/loading';const root=createRoot(document.getElementById('root'));const data=${JSON.stringify(fixture)};window.show=(mode='loaded')=>root.render(<AppShell workspaceName="Acme Studio" userName="Priya">{mode==='error'?<AnalyticsError reset={()=>window.retryCount=(window.retryCount||0)+1}/>:mode==='loading'?<AnalyticsLoading/>:<AnalyticsOverview data={mode==='empty'?{...data,openRoles:0,active:0,hired:0,conversion:0,total:0,withdrawn:0,stages:data.stages.map(x=>({...x,count:0})),sourceCounts:[],interviewCounts:[]}:data}/>}</AppShell>);window.show();`;
async function main() {
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const bundle = build(source);
  const css = ['app/globals.css', 'app/dashboard/dashboard.css', 'app/dashboard/overview.css', 'app/mobile.css', 'app/theme.css'].map(file => fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8')).join('\n').replace(/@import[^;]+;/g, '');
  const server = http.createServer((req, res) => { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><div id="root"></div><script>${bundle.replaceAll('</script', '<\\/script')}</script>`); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ reducedMotion: 'reduce' }); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    for (const mode of ['loaded', 'empty', 'loading', 'error']) {
      await page.evaluate(mode => window.show(mode), mode);
      for (const width of [320, 390, 768, 1024, 1536]) {
        await page.setViewportSize({ width, height: 950 });
        await page.waitForFunction(mode => mode === 'loading' ? !!document.querySelector('.analyticsLoading') : mode === 'error' ? !!document.querySelector('[role="alert"]') : !!document.querySelector('.analyticsPage'), mode);
        const size = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
        assert(size.content <= size.viewport + 1, `${mode} overflow at ${width}`);
        if (mode === 'loaded' && width === 1536) await page.screenshot({ path: 'D:/Temp/recruit-analytics.png', fullPage: true });
      }
      if (mode === 'empty') { assert.equal(await page.locator('[style*="NaN"]').count(), 0); await page.getByText('No candidate sources yet.', { exact: false }).waitFor(); }
    }
    await page.getByRole('button', { name: 'Retry analytics' }).click();
    assert.equal(await page.evaluate(() => window.retryCount), 1);
    assert.equal(await page.getByRole('link', { name: 'Analytics', exact: true }).getAttribute('href'), '/dashboard/analytics');
    assert.deepEqual(errors, []);
    console.log('PASS analytics: 20 responsive state checks, retry action and navigation');
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
