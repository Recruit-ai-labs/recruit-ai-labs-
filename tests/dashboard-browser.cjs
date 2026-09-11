const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const { build } = require('./ui-interactions.cjs');
const stages = ['new', 'screening', 'interview', 'assessment', 'offer', 'hired', 'rejected'];
const data = {
  jobs: { totalItems: 12, items: [{ id: 'j1', title: 'Senior Product Designer', department: 'Design', location: 'Bengaluru, India', workplace_type: 'hybrid', openings: 2 }, { id: 'j2', title: 'Full Stack Engineer', department: 'Engineering', location: 'Remote', workplace_type: 'remote', openings: 3 }] },
  candidates: { totalItems: 248, items: [{ id: 'c1', first_name: 'Aarav', last_name: 'Sharma', current_title: 'Senior Product Designer', source: 'referral' }, { id: 'c2', first_name: 'Meera', last_name: 'Patel', current_title: 'Frontend Engineer', source: 'career-site' }] },
  interviews: { totalItems: 8, items: [{ id: 'i1', title: 'Product design · Portfolio review', starts_at: '2026-09-10T05:00:00Z', interview_type: 'video' }] },
  completedInterviews: { totalItems: 16, items: [{ id: 'i2', title: 'Engineering · Technical discussion', starts_at: '2026-09-08T09:00:00Z', candidate_answers: [{}], interview_type: 'technical' }] },
  pipeline: stages.map((stage, i) => ({ stage, count: [48, 32, 18, 12, 6, 9, 14][i] })), activeApplications: 116,
};
const source = `import React from 'react';import {createRoot} from 'react-dom/client';import AppShell from './app/dashboard/components/AppShell';import DashboardOverview from './app/dashboard/components/DashboardOverview';const root=createRoot(document.getElementById('root'));const data=${JSON.stringify(data)};window.show=(empty=false,canManage=true)=>root.render(<AppShell workspaceName="Acme Studio" userName="Priya"><DashboardOverview name="Priya" workspaceName="Acme Studio" canManage={canManage} data={empty?{jobs:{items:[],totalItems:0},candidates:{items:[],totalItems:0},interviews:{items:[],totalItems:0},completedInterviews:{items:[],totalItems:0},pipeline:data.pipeline.map(x=>({...x,count:0})),activeApplications:0}:data}/></AppShell>);window.show();`;
async function main() {
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const bundle = build(source);
  const css = ['app/globals.css', 'app/dashboard/dashboard.css', 'app/dashboard/overview.css', 'app/mobile.css', 'app/theme.css'].map(file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')).join('\n').replace(/@import[^;]+;/g, '');
  const server = http.createServer((req, res) => { if (req.url === '/recruit-ai-logo.png') { res.setHeader('Content-Type', 'image/png'); return res.end(fs.readFileSync(path.join(__dirname, '../public/recruit-ai-logo.png'))); } res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><div id="root"></div><script>${bundle.replaceAll('</script', '<\\/script')}</script>`); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ reducedMotion: 'reduce' }); const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    for (const width of [320, 390, 768, 1024, 1280, 1536]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.getByRole('heading', { name: 'Your hiring, at a glance.' }).waitFor();
      const size = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
      assert(size.content <= size.viewport + 1, `Overflow at ${width}: ${size.content}`);
      if ([390, 1536].includes(width)) await page.screenshot({ path: `D:/Temp/dashboard-overview-${width}.png`, fullPage: true });
    }
    const palette = await page.evaluate(() => ({ bars: [...document.querySelectorAll('.overviewBar')].map(bar => getComputedStyle(bar).backgroundColor), action: getComputedStyle(document.querySelector('.overviewHeadingActions .primaryAction')).backgroundColor }));
    assert.equal(new Set(palette.bars).size, 7, 'Each pipeline stage has a distinct color');
    assert.equal(palette.action, 'rgb(0, 89, 79)', 'Primary action uses dark green teal');
    assert.equal(await page.getByRole('link', { name: '+ Create job', exact: true }).getAttribute('href'), '/dashboard/jobs/new');
    assert.equal(await page.getByRole('link', { name: 'Product design · Portfolio review', exact: false }).getAttribute('href'), '/dashboard/interviews/i1/scorecard');
    assert.equal(await page.getByRole('link', { name: 'Engineering · Technical discussion', exact: false }).getAttribute('href'), '/dashboard/interviews/i2/candidate-response');
    await page.evaluate(() => window.show(true, false));
    await page.getByText('No open roles yet.', { exact: false }).waitFor();
    assert.equal(await page.getByRole('link', { name: '+ Create job', exact: true }).count(), 0);
    assert.equal(await page.locator('[style*="NaN"]').count(), 0);
    assert.deepEqual(errors, []);
    console.log('PASS dashboard: 6 responsive widths, detail destinations, empty state and viewer permissions');
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
