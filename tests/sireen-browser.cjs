// Isolated browser verification: actual React UI, mocked interview transport, no external services.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const swc=require('next/dist/build/swc');
const root=path.resolve(__dirname,'..');
function bundle(source){
 const modules=[],ids=new Map();
 function add(file,source){if(ids.has(file))return ids.get(file);const id=modules.length;ids.set(file,id);modules.push('');let code=source??fs.readFileSync(file,'utf8');if(!file.includes('node_modules'))code=swc.transformSync(code,{jsc:{target:'es2020',parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}}).code;
 code=code.replace(/require\(["']([^"']+)["']\)/g,(_,spec)=>{const base=path.resolve(path.dirname(file),spec);const resolved=spec.startsWith('.')?['','.js','.jsx'].map(ext=>base+ext).find(p=>fs.existsSync(p)):require.resolve(spec,{paths:[path.dirname(file)]});if(!resolved)throw Error(spec);return `require(${add(resolved)})`;});modules[id]=`function(module,exports,require){${code}\n}`;return id;}
 const id=add(path.join(root,'sireen-test-entry.jsx'),source);return `var process={env:{NODE_ENV:'production'}};var modules=[${modules.join(',')}],cache={};function require(id){if(cache[id])return cache[id].exports;var m=cache[id]={exports:{}};modules[id](m,m.exports,require);return m.exports}require(${id});`;
}
async function main(){
 const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'D:/Temp/discovery-browser-tools/node_modules/playwright');
 const js=bundle(`import React from 'react';import {createRoot} from 'react-dom/client';import Interview from './app/interview/[token]/InterviewExperience';createRoot(document.getElementById('root')).render(<Interview token={'a'.repeat(64)} role="Backend Engineer" mission="Build reliable services that make complex work feel simple."/>);`);
 const css=fs.readFileSync(path.join(root,'app/interview/sireen.css'),'utf8');
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}'+css+'</style></head><body><div id="root"></div><script>'+js.replaceAll('</script','<\\/script')+'</script></body></html>');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try {
  browser=await chromium.launch({headless:true,channel:'chrome',args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
  const page=await browser.newPage({viewport:{width:1440,height:1050}});page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',error=>errors.push(error.message));
  let state={registered:false},submitted=[],failNext=true;
  await page.route('**/api/sireen/**',async route=>{
   const req=route.request();let status=200;
   if(req.method()==='POST'){
    if(req.headers()['content-type'].includes('multipart/form-data'))state={registered:true,status:'ready',answered:0,events:0};
    else{const data=req.postDataJSON();if(data.action==='advance'&&failNext){failNext=false;return route.fulfill({status:502,contentType:'application/json',body:JSON.stringify({error:'Sireen could not prepare a complete response. Your saved answers are safe. Please retry.'})});}if(['start','resume'].includes(data.action))state.status='active';if(data.action==='advance')state.question={id:`q${state.answered+1}`,prompt:`Tell me about project decision ${state.answered+1}, including your contribution and how you tested the result.`};if(data.action==='answer'){submitted.push(data.answer);state.answered++;state.question=null;if(state.answered===5)state.status='completed';}if(data.action==='event'){state.events++;state.status=state.events>=3?'terminated':'paused';}if(data.action==='analyze')state.analysisReady=true;}
   }
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(state)});
  });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.getByLabel('First name',{exact:true}).fill('Asha');await page.getByLabel('Email address').fill('asha@example.test');
  for(const width of [390,768,1440]){await page.setViewportSize({width,height:1050});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  await page.screenshot({path:'D:/Temp/sireen-onboarding.png',fullPage:true});
  await page.getByRole('button',{name:'Continue to resume'}).click();await page.getByLabel('Or paste').fill('I built APIs with database transactions, retries, idempotency and integration tests for a production logistics system.');
  await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Meet Sireen'}).click();await page.getByRole('button',{name:'How the interview works'}).click();await page.getByRole('button',{name:'Continue to device check'}).click();console.log('PASS registration and preparation');
  await page.getByRole('button',{name:'Enable camera'}).click();await page.getByText('Devices connected.',{exact:false}).waitFor();await page.getByRole('button',{name:'Start in fullscreen'}).click();await page.getByRole('alert').filter({hasText:'Sireen could not prepare'}).waitFor();await page.getByRole('button',{name:'Retry question'}).click();await page.getByLabel('Your answer',{exact:true}).waitFor();
  await page.getByLabel('Your answer',{exact:true}).fill('I used idempotency keys to prevent duplicate writes and verified the retry path with integration tests.');
  await page.screenshot({path:'D:/Temp/sireen-interview.png',fullPage:true});
  await page.evaluate(()=>document.exitFullscreen());await page.getByText('INTERVIEW PAUSED',{exact:true}).waitFor();assert.equal(state.events,1);
  await page.getByRole('button',{name:'Resume in fullscreen'}).click();
  assert.match(await page.getByLabel('Your answer',{exact:true}).inputValue(),/idempotency/);
  for(let i=1;i<=5;i++){if(i>1)await page.getByLabel('Your answer',{exact:true}).fill(`My contribution ${i} included testing failure behavior and documenting trade-offs.`);await page.getByRole('button',{name:i===5?'Finish interview':'Submit answer'}).click();if(i<5)await page.getByText(`Question ${i+1}`,{exact:false}).first().waitFor();}
  await page.getByText('You’ve done your part.').waitFor();assert.equal(submitted.length,5);assert.equal(state.status,'completed');
  // A separate candidate exercises three resumptions and automatic session termination.
  state={registered:true,status:'ready',answered:0,events:0};await page.reload();await page.getByRole('button',{name:'Enable camera'}).click();await page.getByText('Devices connected.',{exact:false}).waitFor();await page.getByRole('button',{name:'Start in fullscreen'}).click();
  for(let i=1;i<=3;i++){await page.getByLabel('Your answer',{exact:true}).waitFor();await page.evaluate(()=>document.exitFullscreen());if(i<3){await page.getByText('INTERVIEW PAUSED',{exact:true}).waitFor();await page.getByRole('button',{name:'Resume in fullscreen'}).click();}}
  await page.getByText('Your recruiter will review this session.').waitFor();assert.equal(state.events,3);assert.equal(state.status,'terminated');
  assert.deepEqual(errors,[]);console.log('PASS: 390/768/1440px layout, registration, devices, fullscreen pause, answer preservation, five answers, completion and three-incident termination.');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
module.exports.bundle=bundle;
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
