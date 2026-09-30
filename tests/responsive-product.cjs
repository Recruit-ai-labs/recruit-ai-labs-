// Actual client components with fixture auth/data; no emails or customer records are touched.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const { build } = require('./ui-interactions.cjs');
const root = path.resolve(__dirname, '..');
const fixture = { jobs: { totalItems: 2, items: [] }, candidates: { totalItems: 20, items: [] }, interviews: { items: [] }, completedInterviews: { items: [] }, pipeline: ['new','screening','interview','offer'].map(stage => ({ stage, count: 5 })), activeApplications: 20 };
const source = `import React from 'react';import {createRoot} from 'react-dom/client';
import Landing from './app/page';import AuthShell from './app/components/AuthShell';import SignInPanel from './app/components/SignInPanel';import EmailAccessForm from './app/components/EmailAccessForm';
import AppShell from './app/dashboard/components/AppShell';import Overview from './app/dashboard/components/DashboardOverview';import Discovery from './app/dashboard/discovery/DiscoveryClient';
import JobForm from './app/dashboard/jobs/JobForm';import CandidateForm from './app/dashboard/candidates/CandidateForm';import InterviewForm from './app/dashboard/interviews/new/InterviewForm';import {WorkspaceForm,InviteForm} from './app/dashboard/settings/SettingsForms';import CookieConsent from './app/components/DpdpCookieConsent';
const app=createRoot(document.getElementById('root'));const long='VeryLongRecruitingWorkspaceNameWithoutSpaces';
function Lists(){return <div className="productPage"><header className="pageHeading"><div><h1>Candidates</h1><p>Review candidates and manage your pipeline.</p></div><a className="primaryAction">Add candidate</a></header><form className="moduleToolbar candidateToolbar"><div><b>24 candidates</b></div><label className="moduleSearch"><input placeholder="Search candidates"/></label><select aria-label="Status"><option>Screening</option></select><button>Apply</button></form><section className="dataSurface">{[1,2].map(id=><div key={id} className="dataRow four"><div className="candidateIdentity"><div><b>{long}</b><small>{long}@example.com</small></div></div><span>Senior Engineer</span><span>Bengaluru</span><form><select aria-label={'Stage '+id}><option>Interview</option></select><button>Save</button></form></div>)}</section></div>}
window.show=name=>app.render(<React.Fragment key={name}>{name==='landing'?<Landing/>:name==='sign-in'?<AuthShell type="sign-in"><SignInPanel/></AuthShell>:name==='sign-up'?<AuthShell type="sign-up"><EmailAccessForm/></AuthShell>:name==='contact'?<AuthShell type="contact"><EmailAccessForm/></AuthShell>:<AppShell workspaceName={long} isPro={true}>{name==='overview'?<Overview data={${JSON.stringify(fixture)}} name="Recruiter" workspaceName={long} canManage/>:name==='discovery'?<Discovery/>:name==='job'?<JobForm/>:name==='candidate'?<CandidateForm/>:name==='settings'?<div className="settingsGrid"><section className="surfaceCard"><WorkspaceForm workspace={{name:long,website:'',company_size:'11-50'}}/></section><section className="surfaceCard"><InviteForm/></section></div>:name==='interview'?<section className="surfaceCard"><InterviewForm applications={[]}/></section>:<Lists/>}</AppShell>}<CookieConsent/></React.Fragment>);window.show('landing');`;
async function main() {
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const bundle = build(source);
  const files = ['app/globals.css','app/mobile.css','app/theme.css','app/landing-hero.css','app/auth-provider-preview.css','app/waiting-list/waiting-list.css','app/legal-pages.css','app/legal-overrides.css','app/dashboard/daisy.css','app/dashboard/dashboard.css','app/dashboard/overview.css','app/dashboard/design-system.css','app/dashboard/pro-gates.css','app/dashboard/discovery/discovery-modern.css','app/dashboard/discovery/discovery-polish.css','app/responsive.css'];
  const postcss = require('postcss'), tailwind = require('@tailwindcss/postcss');
  const chunks = [];
  for (const file of files) {
    const css = fs.readFileSync(path.join(root,file),'utf8');
    chunks.push(file.endsWith('daisy.css') ? (await postcss([tailwind()]).process(css,{from:path.join(root,file)})).css : css.replace(/@import[^;]+;/g,''));
  }
  chunks.push(fs.readFileSync(path.join(root,'app/components/DiscoveryTablet.module.css'),'utf8').replace(/\.([a-zA-Z_][\w-]*)/g,'.testModule_$1'));
  chunks.push(fs.readFileSync(path.join(root,'app/dashboard/discovery/discovery-workspace.css'),'utf8'));
  const css = chunks.join('\n');
  const server = http.createServer((req,res)=>{
    const file=path.resolve(root,'public','.'+req.url.split('?')[0]);
    if(file.startsWith(path.join(root,'public')+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile())return res.end(fs.readFileSync(file));
    res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style><div id="root"></div><script>'+bundle.replaceAll('</script','<\\/script')+'</script>');
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
  try {
    browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||'chrome'});
    const page=await browser.newPage({reducedMotion:'reduce'}),errors=[],failures=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(()=>localStorage.setItem('recruit_ai_dpdp_consent','strict'));
    await page.route('**/api/discovery/simple',r=>r.fulfill({json:{results:[{candidate:{name:'AlexVeryLongCandidateNameWithoutSpaces',title:'Senior Full Stack Engineer',company:'Example company',url:'https://linkedin.com/in/alex/',email:'private@example.com',phone:'+91 98765 43210',snippet:'Built TypeScript services. private@example.com +91 98765 43210'},techDna:'Fit: Built TypeScript services. Screen: Confirm technical ownership.'},{candidate:{name:'Github person',url:'https://github.com/person'}}]}}));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    async function check(screen,width){await page.waitForTimeout(80);const result=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,culprits:[...document.querySelectorAll('body *')].filter(el=>{const rect=el.getBoundingClientRect();return rect.right>innerWidth+2&&rect.width>0&&getComputedStyle(el).visibility!=='hidden'}).slice(0,8).map(el=>el.className||el.tagName)}));if(result.scroll>width+1)failures.push({screen,width,...result});}
    let checks=0;
    for(const width of [320,360,390,768,1024,1440]){
      await page.setViewportSize({width,height:900});
      for(const screen of ['landing','sign-in','sign-up','contact','overview','discovery','job','candidate','settings','interview','lists']){
        await page.evaluate(name=>window.show(name),screen);await check(screen,width);checks++;
        if(screen==='discovery'){
          await page.getByRole('button',{name:'Skip & Enter Manually'}).click();await check('discovery-filters',width);checks++;
          await page.getByRole('button',{name:/Proceed to Location/}).click();await page.getByRole('button',{name:/Find Talent/}).click();await page.getByRole('link',{name:/Open LinkedIn/}).waitFor();await check('discovery-results',width);checks++;
          assert.equal(await page.getByRole('link',{name:/Open LinkedIn/}).count(),1);
          assert(!await page.getByText('private@example.com',{exact:false}).count());assert(!await page.getByText('+91 98765 43210',{exact:false}).count());assert.equal(await page.getByText('Copy contact').count(),0);
        }
      }
    }
    await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.show('overview'));
    await page.getByRole('button',{name:'Open navigation'}).click();await page.getByRole('link',{name:'Candidates',exact:true}).waitFor();await page.keyboard.press('Escape');assert.equal(await page.getByRole('button',{name:'Open navigation'}).getAttribute('aria-expanded'),'false');
    for(const screen of ['landing','sign-in','overview','discovery']){await page.evaluate(name=>window.show(name),screen);await page.waitForTimeout(100);await page.screenshot({path:'D:/Temp/responsive-'+screen+'.png',fullPage:true});}
    await page.setViewportSize({width:390,height:380});await page.evaluate(()=>window.show('sign-in'));await page.getByRole('button',{name:/Continue with email/}).scrollIntoViewIfNeeded();assert(await page.getByRole('button',{name:/Continue with email/}).isVisible());
    console.log(JSON.stringify({checks,failures,errors},null,2));assert.deepEqual(failures,[]);assert.deepEqual(errors,[]);
    console.log('PASS responsive product matrix, LinkedIn-only cards, contact removal, drawer keyboard control, and short-screen sign in.');
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1});
