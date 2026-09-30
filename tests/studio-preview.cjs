const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {build}=require('./ui-interactions.cjs');
const {chromium}=require('D:/Temp/discovery-browser-tools/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const source="import React from 'react';import {createRoot} from 'react-dom/client';import Shell from './app/dashboard/components/AppShell';import Chat from './app/dashboard/components/WorkspaceAssistant';createRoot(document.getElementById('root')).render(<Shell><Chat name='Jason'/></Shell>);";
async function main(){
 const bundle=build(source);
 const css=['app/globals.css','app/dashboard/dashboard.css','app/dashboard/design-system.css','app/dashboard/studio.css'].map(f=>fs.readFileSync(path.join(root,f),'utf8').replace(/@import[^;]+;/g,'')).join('\n');
 const server=http.createServer((req,res)=>{if(req.url.startsWith('/recruit-ai-logo')){res.end(fs.readFileSync(path.join(root,'public/recruit-ai-logo.png')));return;}res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style><div id="root"></div><script>'+bundle+'</script>');});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:960}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/workspace-assistant',r=>r.fulfill({status:200,contentType:'text/plain; charset=utf-8',body:'Your workspace has 3 open roles.'}));
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.getByRole('heading',{name:/Good to see you/}).waitFor();await page.screenshot({path:'D:/Temp/studio-desktop.png',fullPage:true});
  await page.getByRole('textbox',{name:'Ask Recruit AI'}).fill('What is happening?');await page.getByRole('button',{name:'Send message'}).click();await page.getByText('Your workspace has 3 open roles.').waitFor();
  await page.getByRole('button',{name:'New chat'}).click();
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'D:/Temp/studio-mobile.png',fullPage:true});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('link',{name:'Candidates',exact:true}).waitFor();await page.keyboard.press('Escape');
  assert.deepEqual(errors,[]);console.log('PASS desktop/mobile layout, chat response, reset and navigation; screenshots in D:/Temp/studio-*.png');
 }finally{await browser.close();server.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1});
