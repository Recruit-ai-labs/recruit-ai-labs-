// Isolated real-browser UI checks. All server operations are deterministic fixtures.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const { build } = require('./ui-interactions.cjs');
const root = path.resolve(__dirname, '..');
const source = `
import React from 'react';import {createRoot} from 'react-dom/client';
import DiscoveryWorkspace from './app/dashboard/discovery/DiscoveryWorkspace';
import AppShell from './app/dashboard/components/AppShell';
import {discoverCandidates} from './lib/discovery-core.mjs';
const jobs=[{id:'jjjjjjjjjjjjjjj',title:'Frontend Developer',required:['React','JavaScript'],preferred:['Azure'],minExperience:null}];
const api={
 resolve:async q=>({message:'Select the intended meaning.',entities:[{name:'Cambridge',type:'city',location:'England',aliases:[],source:'https://example.org/uk',quote:'Cambridge is a city in England.'},{name:'Cambridge',type:'city',location:'Massachusetts',aliases:[],source:'https://example.org/us',quote:'Cambridge is a city in Massachusetts.'}],sources:[]}),
 parse:async()=>({brief:{title:'Parsed role',required:['React'],preferred:[],minExperience:null},evidence:[{skill:'React',quote:'React required'}],message:'Review the extracted requirements.'}),
 search:async input=>{window.searchInput=input;if(window.failSearch)return {error:'Search temporarily unavailable'};return {brief:input.brief,entity:input.entity,searchedAt:'2026-09-08T12:00:00.000Z',workspace:{scanned:2,total:2,partial:false,warnings:[],candidates:discoverCandidates({candidates:[{id:'ccccccccccccccc',first_name:'Maya',status:'active',skills:['React','JavaScript'],location:'Cambridge, Massachusetts',source:'referral'},{id:'bbbbbbbbbbbbbbb',first_name:'Arun',status:'active',skills:[],source:'manual'}],brief:input.brief,entity:input.entity})},web:input.includeWeb?{complete:true,leads:[{url:'https://example.org/portfolio',title:'Sample portfolio',snippet:'A public project portfolio.',channels:['Portfolios across the web'],verification:'Unverified search result'}],searches:[{channel:'Portfolios across the web',query:'test query',count:1}]}:null}},
 save:async input=>{window.savedInput=input;return {message:'Search saved.'}},
 add:async(job,id)=>{window.added={job,id};return {message:'Candidate is in the job pipeline.',href:'/dashboard/jobs/'+job+'/candidates/'+id+'/evaluation'}}
};
createRoot(document.getElementById('root')).render(<AppShell workspaceName="Acme"><DiscoveryWorkspace jobs={jobs} capabilities={{web:true,ai:true}} api={api}/></AppShell>);
`;
const bundle = build(source);
const css = fs.readFileSync(path.join(root, 'app/dashboard/dashboard.css'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'app/dashboard/discovery/discovery.css'), 'utf8');
async function main() {
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const server = http.createServer((req, res) => { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:Arial,sans-serif}*{box-sizing:border-box}' + css + '</style></head><body><div id="root"></div><script>' + bundle.replaceAll('</script', '<\\/script') + '</script></body></html>'); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.getByLabel('Use a saved job').selectOption('jjjjjjjjjjjjjjj');
    assert.match(await page.getByLabel('Required skills', { exact: false }).inputValue(), /React/);
    await page.getByLabel('Place or organisation').fill('Cambridge');
    await page.getByRole('button', { name: 'Discover candidates' }).click();
    await page.getByRole('alert').filter({ hasText: 'Select a suggested interpretation' }).waitFor();
    await page.getByRole('button', { name: 'Identify from web sources' }).click();
    await page.getByRole('button', { name: /Cambridge.*Massachusetts/ }).click();
    assert.equal(await page.getByRole('button', { name: /Cambridge.*England/ }).getAttribute('aria-pressed'), 'false');
    await page.getByLabel('Search public profiles & portfolios').check();
    await page.getByRole('button', { name: 'Discover candidates' }).click();
    await page.getByText('2 workspace profiles ? 1 public leads').waitFor();
    assert.equal(await page.evaluate(() => window.searchInput.entity.location), 'Massachusetts');
    await page.getByRole('link', { name: 'Maya', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Add to selected job' }).click();
    await page.getByText('Candidate is in the job pipeline.', { exact: false }).waitFor();
    assert.equal((await page.evaluate(() => window.added)).id, 'ccccccccccccccc');
    await page.getByRole('button', { name: /Needs more evidence/ }).click();
    await page.getByRole('link', { name: 'Arun', exact: true }).waitFor();
    await page.getByText('Evidence & next steps', { exact: true }).click();
    await page.getByText('Collect a work sample or structured answer for React.', { exact: true }).waitFor();
    await page.getByRole('button', { name: /Web leads/ }).click();
    await page.getByRole('link', { name: 'Sample portfolio' }).waitFor();
    assert.match(await page.locator('.discoveryWeb').innerText(), /unverified search leads/);
    await page.getByLabel('Save these search criteria').fill('Cambridge frontend');
    await page.getByRole('button', { name: 'Save search', exact: true }).click();
    await page.getByText('Search saved.', { exact: true }).waitFor();
    assert.equal((await page.evaluate(() => window.savedInput)).entity.location, 'Massachusetts');
    await page.getByRole('button', { name: /Documented requirements/ }).click();
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.waitForTimeout(120);
      const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
      assert.ok(dimensions.scroll <= width + 1, `Horizontal overflow at ${width}: ${dimensions.scroll}`);
      if (width === 1440 || width === 390) await page.screenshot({ path: `D:/Temp/discovery-${width}.png`, fullPage: true });
    }
    await page.getByLabel('Role title', { exact: true }).fill('Updated role');
    assert.equal(await page.getByText('2 workspace profiles ? 1 public leads').count(), 0, 'Editing a criterion must invalidate old results');
    await page.evaluate(() => window.failSearch = true);
    await page.getByRole('button', { name: 'Discover candidates' }).click();
    await page.getByRole('alert').filter({ hasText: 'Search temporarily unavailable' }).waitFor();
    assert.equal(await page.getByLabel('Role title', { exact: true }).inputValue(), 'Updated role');
    assert.deepEqual(errors, []);
    console.log('PASS discovery browser: ambiguous scope, job prefill, evidence lanes, pipeline action, unverified web leads, saved criteria, stale-result invalidation, failure recovery, and 4 responsive widths.');
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
