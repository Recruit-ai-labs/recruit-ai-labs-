// Actual components and styles; isolated records/actions, no external AI or customer writes.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const { build } = require('./workspace-browser-bundle.cjs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'D:/Temp/discovery-browser-tools/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const source = `import React from 'react';import {createRoot} from 'react-dom/client';
import Shell from './app/dashboard/components/AppShell';import Overview from './app/dashboard/components/DashboardOverview';
import Jobs from './app/dashboard/jobs/page';import Job from './app/dashboard/jobs/[jobId]/page';
import JobForm from './app/dashboard/jobs/JobForm';import CandidateForm from './app/dashboard/candidates/CandidateForm';
import {WorkspaceForm,InviteForm} from './app/dashboard/settings/SettingsForms';
window.fixtureJob={id:'j1',title:'Senior Product Engineer',department:'Engineering',location:'Bengaluru, India',workplace_type:'Hybrid',employment_type:'Full-time',status:'open',openings:2,experience_min:3,experience_max:6,must_have_skills:['React','TypeScript','Product thinking'],nice_to_have_skills:['Design systems'],hiring_manager_name:'Jordan Lee',description:'Build thoughtful software with a small, collaborative team. Work across design and engineering to deliver reliable product experiences.',responsibilities:'Own product features from discovery through delivery. Test your work and help the team make clear technical decisions.'};
const data={jobs:{totalItems:2,items:[window.fixtureJob,{...window.fixtureJob,id:'j2',title:'Lead Product Designer',department:'Design'}]},candidates:{totalItems:24},activeApplications:12,pipeline:[{stage:'new',count:5},{stage:'screening',count:4},{stage:'assessment',count:2},{stage:'offer',count:1}]};
const app=createRoot(document.getElementById('root'));
window.show=async screen=>{const view=screen==='jobs'?await Jobs({searchParams:Promise.resolve({})}):screen==='role'?await Job({params:Promise.resolve({jobId:'j1'})}):screen==='job-form'?<JobForm/>:screen==='candidate-form'?<CandidateForm/>:screen==='settings'?<div className="settingsGrid"><section className="settingsCard"><h2>Workspace</h2><WorkspaceForm workspace={{name:'Acme',company_size:'11-50'}}/></section><section className="settingsCard"><h2>Invite a teammate</h2><InviteForm/></section></div>:<Overview name="Jordan" data={data} canManage/>;app.render(<Shell workspaceName="Acme Studio" userName="Jordan">{view}</Shell>)};window.show('overview');`;
async function main() {
  const bundle = build(source);
  const files = ['app/globals.css','app/mobile.css','app/theme.css','app/responsive.css','app/dashboard/daisy.css','app/dashboard/dashboard.css','app/dashboard/overview.css','app/dashboard/design-system.css','app/dashboard/pro-gates.css','app/dashboard/studio.css','app/dashboard/responsive-polish.css','app/dashboard/workspace-refresh.css'];
  const chunks = [];
  for (const file of files) {
    const css = fs.readFileSync(path.join(root, file), 'utf8');
    chunks.push(file.endsWith('daisy.css') ? (await require('postcss')([require('@tailwindcss/postcss')()]).process(css, { from:path.join(root,file) })).css : css.replace(/@import[^;]+;/g, ''));
  }
  const server = http.createServer((req,res) => {
    if (req.url.startsWith('/recruit-ai-logo')) return res.end(fs.readFileSync(path.join(root,'public/recruit-ai-logo.png')));
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+chunks.join('\n')+'</style><div id="root"></div><script>'+bundle.replaceAll('</script','<\\/script')+'</script>');
  });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless:true, channel:'chrome' });
    const page = await browser.newPage(), errors = [], failures = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/api/workspace-assistant', route => route.fulfill({status:200,contentType:'text/plain',body:'Your workspace has 2 open jobs.'}));
    await page.goto('http://127.0.0.1:'+server.address().port);
    for (const width of [320,390,768,1024,1440]) {
      await page.setViewportSize({width,height:1000});
      for (const view of ['overview','jobs','role','job-form','candidate-form','settings']) {
        await page.evaluate(view => window.show(view), view); await page.waitForTimeout(550);
        const overflow = await page.evaluate(() => ({width:document.documentElement.scrollWidth, inner:innerWidth, culprits:[...document.querySelectorAll('body *')].filter(el => { const r = el.getBoundingClientRect(); return r.right > innerWidth + 1 && r.width > 0; }).slice(0, 8).map(el => ({tag:el.tagName, cls:String(el.className), right:Math.round(el.getBoundingClientRect().right), width:Math.round(el.getBoundingClientRect().width)}))}));
        if (overflow.width > width + 1) failures.push({view,width,overflow});
        if (['overview','role'].includes(view) && [390,1440].includes(width)) await page.screenshot({path:`D:/Temp/refresh-${view}-${width}.png`,fullPage:true});
      }
    }
    await page.evaluate(() => window.show('role'));
    assert.equal(await page.locator('.jobWorkspaceHeader').getByRole('link',{name:/Create interview/}).getAttribute('href'),'/dashboard/jobs/j1/interview-link');
    assert.equal(await page.locator('.jobTabs').getByText('Create interview').count(),0);
    await page.locator('.jobTabs a[href="#pipeline"]').click();
    assert.equal(await page.locator('.jobTabs a[href="#pipeline"]').getAttribute('aria-current'),'location');
    await page.locator('.jobManageMenu summary').click();
    await page.getByRole('link',{name:'Edit job details'}).waitFor();
    await page.evaluate(() => window.show('overview'));
    await page.locator('.overviewAssistant summary').click();
    await page.getByLabel('Ask Recruit AI').fill('What is happening?');
    await page.getByRole('button',{name:'Send message'}).click();
    await page.getByText('Your workspace has 2 open jobs.').waitFor();
    await page.getByRole('searchbox',{name:'Search workspace'}).fill('Engineer');
    await page.getByRole('searchbox',{name:'Search workspace'}).press('Enter');
    assert.equal(await page.evaluate(() => window.lastNavigation),'/dashboard/search?q=engineer');
    await page.setViewportSize({width:390,height:844});
    await page.getByRole('button',{name:'Open navigation',exact:true}).click();
    await page.getByRole('link',{name:'Candidates',exact:true}).waitFor();
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('button',{name:'Open navigation',exact:true}).getAttribute('aria-expanded'),'false');
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.evaluate(() => window.show('overview'));await page.waitForTimeout(100);
    assert.equal(await page.locator('.overviewMetrics').evaluate(el => getComputedStyle(el).opacity),'1');
    console.log(JSON.stringify({failures,errors}));assert.deepEqual(failures,[]);assert.deepEqual(errors,[]);
    console.log('PASS: 30 responsive views, interview header action, section navigation, manage menu, assistant, search, mobile drawer and reduced motion.');
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => {console.error(error);process.exitCode=1;});
