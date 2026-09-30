const fs=require('node:fs'),http=require('node:http'),assert=require('node:assert/strict');
const {build}=require('./ui-interactions.cjs');
async function main(){
 const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
 const bundle=build(`import React from 'react';import {createRoot} from 'react-dom/client';import Tabs from './app/dashboard/candidates/[candidateId]/CandidateTabs';import Report from './app/dashboard/candidates/[candidateId]/CandidateReport';
 const answer='I used React to build accessible forms and tested keyboard navigation.';
 const interview={id:'fixture',title:'Frontend developer — Initial interview',status:'completed',candidate_answers:[{question_id:'q1',prompt:'Describe a project where you used React. What was your contribution and result?',answer}]};
 const evaluation={structured_data:{assessments:[{skill:'React',question_id:'q1',quote:answer,rating:3,reason:'Specific applied example; trade-offs need further review.'}],summary_points:[{question_id:'q1',quote:answer,text:'Candidate describes accessible React forms and keyboard testing.'}]}};
 createRoot(document.getElementById('root')).render(<div className="candidateProfile"><h1>Illustrative candidate</h1><Tabs count={1} report={<Report interview={interview} skills={['React','SQL']} evaluation={evaluation} canManage={false}/>} profile={<p>Profile details</p>} applications={<p>Frontend developer application</p>} activity={<p>Interview submitted</p>}/></div>);`);
 const css=fs.readFileSync('app/dashboard/candidates/[candidateId]/report.css','utf8');
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:20px;background:#f3f5f9;color:#172239;font-family:system-ui}*{box-sizing:border-box}'+css+'</style><div id="root"></div><script>'+bundle.replaceAll('</script','<\\/script')+'</script>');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{browser=await chromium.launch({headless:true,channel:'chrome'});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());await page.goto(`http://127.0.0.1:${server.address().port}`);
 for(const width of [390,1440]){await page.setViewportSize({width,height:1000});await page.getByRole('tab',{name:'Interview report',exact:true}).click();await page.getByText('3 / 5',{exact:true}).first().waitFor();assert(await page.getByText('Not assessed',{exact:true}).isVisible());for(const [tab,text] of [['Profile','Profile details'],['Applications (1)','Frontend developer application'],['Activity','Interview submitted']]){await page.getByRole('tab',{name:tab,exact:true}).click();assert(await page.getByText(text,{exact:true}).isVisible());assert.equal(await page.getByRole('heading',{name:'What the candidate shared'}).isVisible(),false);}await page.getByRole('tab',{name:'Interview report',exact:true}).click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 await page.screenshot({path:'D:/Temp/candidate-report-review.png',fullPage:true});assert.deepEqual(errors,[]);console.log('PASS: report ratings, summary, tabs and 390/1440px layout; no browser errors.');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
