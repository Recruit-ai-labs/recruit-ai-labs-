const fs=require('node:fs'),http=require('node:http'),assert=require('node:assert/strict');
const {build}=require('./ui-interactions.cjs');
const source=`import React from 'react';import {createRoot} from 'react-dom/client';import Session from './app/components/ProtectedSession';createRoot(document.getElementById('root')).render(<Session scope="dashboard"><h1>Protected fixture</h1></Session>);`;
async function main(){
 const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
 const css=fs.readFileSync('app/components/WorkspaceTransition.module.css','utf8').replace(/\.([a-zA-Z_][\w-]*)/g,'.testModule_$1');
 const bundle=build(source),server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}'+css+'</style><div id="root"></div><script>'+bundle+'</script>')});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'chrome'});const page=await browser.newPage();let mode='stall';const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/access/session*',route=>mode==='stall'?undefined:route.fulfill({json:{allowed:true}}));
  await page.goto('http://127.0.0.1:'+server.address().port);
  for(const width of [390,768,1440]){await page.setViewportSize({width,height:900});await page.getByRole('heading',{name:'Opening your workspace…'}).waitFor();assert(await page.getByText('Protected fixture').isHidden());assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'D:/Temp/workspace-transition-'+width+'.png'});}
  await page.clock.install();await page.reload();await page.clock.fastForward(13000);await page.getByRole('button',{name:'Retry connection'}).waitFor();assert(await page.getByText('Protected fixture').isHidden());mode='ready';await page.getByRole('button',{name:'Retry connection'}).click();await page.getByText('Protected fixture').waitFor();assert.deepEqual(errors,[]);console.log('PASS transition 390/768/1440, hidden protected content, timeout and successful retry');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1});
