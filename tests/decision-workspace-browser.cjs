const fs=require('node:fs'),http=require('node:http'),assert=require('node:assert/strict');
const {build}=require('./ui-interactions.cjs');
const candidates=Array.from({length:5},(_,i)=>({id:'c'+i,first_name:'Candidate',last_name:String(i+1),status:'active',consent_status:'obtained'}));
const applications=candidates.map((c,i)=>({id:'a'+i,candidate:c.id,job:'j1',stage:'interview',status:'active'}));
const interviews=[{id:'i1',application:'a0',status:'completed',candidate_answers:[{question_id:'q1',prompt:'Describe TypeScript delivery',answer:'I built TypeScript services with PostgreSQL and deployed automated tests.'}]}];
const source=`import React from 'react';import {createRoot} from 'react-dom/client';import AppShell from './app/dashboard/components/AppShell';import Compare from './app/dashboard/hiring-desk/DecisionCompare';import Delete from './app/dashboard/vetting/DeleteCheck';createRoot(document.getElementById('root')).render(<AppShell workspaceName="Design review"><div className="hiringDesk"><h1>Decision Room</h1><Compare applications={${JSON.stringify(applications)}} candidates={${JSON.stringify(candidates)}} interviews={${JSON.stringify(interviews)}} job={{title:'Platform engineer',must_have_skills:['TypeScript','AWS']}} events={[]} canManage/><section className="settingsCard"><Delete id="abcdefghijklmno" name="Candidate 1"/></section></div></AppShell>);`;
async function main(){
 const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
 const css=['app/dashboard/dashboard.css','app/dashboard/design-system.css','app/dashboard/hiring-desk/desk.css'].map(p=>fs.readFileSync(p,'utf8')).join('\n');
 const bundle=build(source);
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0;font-family:Arial}'+css+'</style><div id="root"></div><script>'+bundle.replaceAll('</script','<\\/script')+'</script>')});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'chrome'});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);
  await page.getByLabel('Completed interviews only').check();assert.equal(await page.locator('.deskSelection label').count(),1);await page.getByLabel('Completed interviews only').uncheck();
  await page.getByLabel('Find a candidate').fill('Candidate 5');assert.equal(await page.locator('.deskSelection label').count(),1);await page.getByLabel('Find a candidate').fill('');
  for(let i=0;i<4;i++)await page.locator('.deskSelection input').nth(i).check();assert(await page.locator('.deskSelection input').nth(4).isDisabled());
  assert.equal(await page.locator('.decisionMatrix thead th').count(),5);assert(await page.getByText('Needs follow-up',{exact:true}).count()>0);
  await page.locator('.deskTools summary').first().click();await page.locator('.deskTools textarea').first().fill('Review a production TypeScript example in the next round.');await page.locator('.deskTools button').first().click();await page.getByText('Saved to workspace history.').waitFor();assert.equal(await page.evaluate(()=>window.deskSubmitted.key),'application:a0');
  await page.getByRole('button',{name:'Delete check for Candidate 1'}).click();await page.getByRole('button',{name:'Keep check'}).click();assert.equal(await page.evaluate(()=>window.deletedCheck),undefined);
  await page.getByRole('button',{name:'Delete check for Candidate 1'}).click();await page.getByRole('button',{name:'Delete check',exact:true}).click();await page.getByRole('alert').waitFor();assert.equal(await page.evaluate(()=>window.deletedCheck),'abcdefghijklmno');
  for(const width of [390,768,1440]){await page.setViewportSize({width,height:950});await page.waitForTimeout(100);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'overflow '+width);await page.screenshot({path:'D:/Temp/decision-room-'+width+'.png',fullPage:true});}
  await page.getByRole('button',{name:'Clear selection'}).click();assert.equal(await page.locator('.decisionMatrix').count(),0);assert.deepEqual(errors,[]);
  console.log('PASS: search, interview filter, four-person limit, evidence matrix, persisted note form, delete confirmation/error, responsive layouts.');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1});
