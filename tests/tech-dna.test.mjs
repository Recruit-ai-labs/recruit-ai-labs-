import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { createClient } from '@libsql/client';
import * as core from '../lib/tech-dna-core.mjs';
import { SireenResponseError } from '../lib/sireen-json.mjs';
import { interviewSchema } from '../lib/tech-dna-schema.mjs';
const require = createRequire(import.meta.url);
const swc = require('next/dist/build/swc');
const blueprint = core.validateBlueprint({role:'Backend engineer',mission:'Build reliable services',criteria:[{name:'API design',expectation:'Explain reliable APIs',weight:3},{name:'Testing',expectation:'Verify failure paths',weight:2},{name:'Data',expectation:'Reason about persistence',weight:1}]},{title:'Backend engineer'});
test('Tech DNA rejects invented quotes, keeps unknowns, and computes weighted coverage separately',()=>{
  const transcript=[{id:'q1',answer:'I tested timeouts using a fake upstream server and verified retries.'}];
  const result=core.validateDNA({criteria:[{id:'c1',rating:5,evidence:[{question_id:'q1',quote:'I built world class APIs'}]},{id:'c2',rating:4,finding:'Tested failure paths',evidence:[{question_id:'q1',quote:'I tested timeouts using a fake upstream server'}]},{id:'c3',rating:5,evidence:[{question_id:'q8',quote:transcript[0].answer}]}]},transcript,blueprint);
  assert.equal(result.criteria[0].rating,null);assert.equal(result.criteria[2].rating,null);assert.equal(result.score,80);assert.equal(result.coverage,33);assert.equal(result.confidence,'Limited evidence');assert.ok(result.dimensions.every(d=>d.rating===null));
  assert.equal(core.validateDNA({},[],blueprint).score,null);
});
test('Questions reject duplicates and malformed role blueprints',()=>{
  assert.throws(()=>core.validateBlueprint({},{}));
  const q=core.validateQuestion({prompt:'Explain your specific API project contribution.',criterion_id:'invalid'},0,blueprint);
  assert.equal(q.id,'q1');assert.equal(q.criterion_id,'c1');
  assert.throws(()=>core.validateQuestion(q,1,blueprint,[q]));
});
function loadModule(file, mocks) {
  const source=fs.readFileSync(new URL(file,import.meta.url),'utf8');
  const code=swc.transformSync(source,{jsc:{target:'es2022',parser:{syntax:'ecmascript',jsx:true}},module:{type:'commonjs'}}).code;
  const module={exports:{}};
  new Function('require','module','exports',code)(name=>{if(Object.hasOwn(mocks,name))return mocks[name];return require(name);},module,module.exports);
  return module.exports;
}
test('Real SQLite route lifecycle: isolation, saved answers, five-question cap, incidents and revocation', async()=>{
  const db=createClient({url:'file::memory:'});
  const jar=new Map();
  const cookies={get:key=>jar.has(key)?{value:jar.get(key)}:undefined,set:(key,value)=>jar.set(key,value)};
  const store=loadModule('../lib/tech-dna-store.js',{'server-only':{},'./turso':{getTursoClient:()=>db},'./tech-dna-schema.mjs':{interviewSchema}});
  let failAI=false, questionsGenerated=0;
  const ai={generateQuestion:async(bp,resume,transcript,questions)=>{if(failAI)throw new SireenResponseError();questionsGenerated++;assert.ok(resume.length>=80);assert.equal(transcript.length,questions.length);return core.validateQuestion({prompt:`Describe a concrete project decision number ${questions.length+1} and how you verified its result.`,criterion_id:'c1'},questions.length,bp,questions);},analyzeDNA:async(bp,transcript)=>({...core.validateDNA({},transcript,bp),model:'test'})};
  const route=loadModule('../app/api/sireen/[token]/route.js',{'next/headers':{cookies:async()=>cookies},'../../../../lib/pocketbase':{getRecord:async()=>({status:'open'})},'../../../../lib/resume-text':{extractResumeText:async()=>{throw Error('unused');}},'../../../../lib/tech-dna-ai':ai,'../../../../lib/tech-dna-core.mjs':core,'../../../../lib/tech-dna-store':store});
  await store.interviewDB();
  await db.execute('CREATE TABLE candidates (id TEXT PRIMARY KEY,workspace TEXT,first_name TEXT,last_name TEXT,email TEXT,source TEXT,status TEXT,consent_status TEXT,consent_at TEXT,skills TEXT,summary TEXT,created TEXT,updated TEXT)');
  await db.execute('CREATE TABLE applications (id TEXT PRIMARY KEY,workspace TEXT,job TEXT,candidate TEXT,stage TEXT,status TEXT,applied_at TEXT,last_activity_at TEXT,created TEXT,updated TEXT)');
  const token='a'.repeat(64), context={params:Promise.resolve({token})}, url=`https://example.test/api/sireen/${token}`;
  await db.execute({sql:'INSERT INTO sireen_links(id,workspace,job,token,blueprint,created,expires) VALUES (?,?,?,?,?,?,?)',args:['l1','w1','j1',token,JSON.stringify(blueprint),new Date().toISOString(),new Date(Date.now()+86400000).toISOString()]});
  const post=async(body,origin='https://example.test')=>{const response=await route.POST(new Request(url,{method:'POST',headers:{Origin:origin,...(body instanceof FormData?{}:{'Content-Type':'application/json'})},body:body instanceof FormData?body:JSON.stringify(body)}),context);return {status:response.status,...await response.json()};};
  const enroll=async email=>{const form=new FormData();form.set('first_name','Test');form.set('email',email);form.set('consent','yes');form.set('resume_text','Built production APIs with retries, database persistence, integration tests and monitoring for a logistics service.');return post(form);};
  try {
    assert.equal((await post({action:'start'},'https://attacker.test')).status,403);
    assert.equal((await post({action:'start'})).status,401);
    assert.equal((await enroll('one@example.test')).registered,true);
    const cookie=[...jar.values()][0];
    assert.equal((await db.execute('SELECT COUNT(*) n FROM candidates')).rows[0].n,1);
    assert.equal((await db.execute('SELECT COUNT(*) n FROM applications')).rows[0].n,1);
    assert.equal((await post({action:'start'})).status,'active');
    const malformed=await route.POST(new Request(url,{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json'},body:'{broken'}),context);
    assert.equal(malformed.status,400);
    assert.equal((await post(null)).status,400);
    failAI=true;const failed=await post({action:'advance'});assert.equal(failed.status,502);assert.equal(failed.retryable,true);failAI=false;
    assert.equal((await db.execute('SELECT COUNT(*) n FROM sireen_leases')).rows[0].n,0);
    assert.equal(JSON.parse((await db.execute('SELECT questions FROM sireen_sessions LIMIT 1')).rows[0].questions).length,0);
    let state=await post({action:'advance'});
    assert.equal(state.question.id,'q1');
    assert.equal((await post({action:'answer',question_id:'q4',answer:'Trying to skip.'})).status,409);
    for(let i=1;i<=5;i++) {
      state=await post({action:'answer',question_id:`q${i}`,answer:`I tested operation ${i} using integration tests and observed the failure behavior.`});
      assert.equal(state.answered,i);
      if(i<5)state=await post({action:'advance'});
    }
    assert.equal(state.status,'completed');
    assert.equal((await post({action:'advance'})).question,null);assert.equal(questionsGenerated,5);
    assert.equal((await post({action:'answer',question_id:'q5',answer:'Replay'})).status,409);
    assert.equal((await post({action:'analyze'})).analysisReady,true);
    const row=(await db.execute('SELECT * FROM sireen_sessions LIMIT 1')).rows[0];
    assert.equal(JSON.parse(row.transcript).length,5);assert.equal(JSON.parse(row.dna).score,null);
    assert.equal((await store.candidateInterviews('other-workspace',row.candidate)).length,0);
    jar.clear(); assert.equal((await route.GET(new Request(url),context)).status,200);
    assert.equal((await post({action:'analyze'})).status,401);
    assert.equal((await enroll('one@example.test')).status,400);
    assert.equal((await enroll('two@example.test')).registered,true);
    await post({action:'start'});await post({action:'advance'});
    let incident=await post({action:'event',kind:'fullscreen_exit'});assert.equal(incident.status,'paused');assert.equal(incident.events,1);
    incident=await post({action:'event',kind:'window_blur'});assert.equal(incident.events,1);
    assert.equal((await post({action:'answer',question_id:'q1',answer:'Paused submission'})).status,409);
    for(let i=2;i<=3;i++) {await db.execute("UPDATE sireen_events SET created='2000-01-01T00:00:00.000Z'");await post({action:'resume'});incident=await post({action:'event',kind:'tab_hidden'});assert.equal(incident.events,i);}
    assert.equal(incident.status,'terminated');assert.equal((await post({action:'resume'})).status,'terminated');
    assert.equal((await post({action:'analyze'})).analysisReady,true);
    jar.set(store.sessionCookie(token),cookie);
    await db.execute('UPDATE sireen_links SET revoked=1');assert.equal((await post({action:'analyze'})).status,404);
  } finally {db.close();}
});
