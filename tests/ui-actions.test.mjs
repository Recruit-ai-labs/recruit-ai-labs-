import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {canSubmitScorecard,buildInterviewQuestions} from '../lib/interview-validation.mjs';
const require=createRequire(import.meta.url);
const {transformSync}=require('next/dist/build/swc');
const context={workspace:{id:'w1'},membership:{role:'owner',status:'active'},userId:'user1'};
function load(file,overrides={}) {
 const dependencies={canSubmitScorecard,buildInterviewQuestions,cookies:async()=>({set:()=>{}}),requireWorkspace:async()=>context,revalidatePath:()=>{},redirect:path=>{throw new Error('REDIRECT:'+path)},pbFilterValue:v=>String(v),canManageJobs:m=>['owner','admin','recruiter'].includes(m.role),canManageCandidates:m=>['owner','admin','recruiter'].includes(m.role),listRecords:async()=>({items:[]}),createRecord:async()=>({id:'new'}),updateRecord:async()=>({}),getWorkspaceContext:async()=>null,auth:async()=>({userId:'user1'}),currentUser:async()=>({emailAddresses:[{emailAddress:'person@example.com',verification:{status:'verified'}}]}),...overrides};
 const source=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
 const code=transformSync(source,{jsc:{target:'es2020',parser:{syntax:'ecmascript'}},module:{type:'commonjs'}}).code;
 const module={exports:{}};new Function('require','module','exports',code)(()=>dependencies,module,module.exports);return module.exports;
}
const form=values=>{const fd=new FormData();Object.entries(values).forEach(([k,v])=>fd.set(k,v));return fd};
test('candidate deletion requires permission, explicit confirmation and workspace ownership', async () => {
 let deletes=0;
 const base={deleteRecord:async()=>{deletes++},getCandidateForWorkspace:async(w,id)=>w==='w1'&&id==='c1'?{id:'c1'}:null};
 for(const [overrides,values] of [
  [{canManageCandidates:()=>false},{candidateId:'c1',confirmed:'yes'}],
  [{},{candidateId:'c1'}],
  [{},{candidateId:'another-workspace',confirmed:'yes'}],
 ]) {
  const action=load('app/dashboard/candidates/actions.js',{...base,...overrides});
  assert.ok((await action.deleteCandidateAction({},form(values))).error);
 }
 assert.equal(deletes,0);
});
test('candidate deletion refreshes workspace pages and redirects only after success', async () => {
 const calls=[];
 const action=load('app/dashboard/candidates/actions.js',{
  getCandidateForWorkspace:async()=>({id:'c1'}),deleteRecord:async(...args)=>calls.push(args),revalidatePath:(...args)=>calls.push(args)
 });
 await assert.rejects(action.deleteCandidateAction({},form({candidateId:'c1',confirmed:'yes'})),/REDIRECT:\/dashboard\/candidates\?deleted=1/);
 assert.deepEqual(calls,[['candidates','c1'],['/dashboard','layout']]);
 const failed=load('app/dashboard/candidates/actions.js',{getCandidateForWorkspace:async()=>({id:'c1'}),deleteRecord:async()=>{throw Error('Database unavailable')}});
 assert.match((await failed.deleteCandidateAction({},form({candidateId:'c1',confirmed:'yes'}))).error,/could not be deleted/);
});
test('Save as draft changes published status in the same update as content',async()=>{
 let patch;
 const action=load('app/dashboard/jobs/actions.js',{getJobForWorkspace:async()=>({id:'j1',status:'open',published_at:'2026-01-01'}),readJobForm:()=>({title:'Changed'}),validateJob:(_,{draft})=>({valid:draft}),updateJobForWorkspace:async input=>{patch=input.data}});
 await assert.rejects(action.updateJobAction({},form({jobId:'j1',intent:'draft'})),/REDIRECT:/);
 assert.equal(patch.status,'draft');assert.equal(patch.title,'Changed');assert.equal(patch.published_at,'');
});
test('View-only users cannot save jobs or workspace settings',async()=>{
 const options={requireWorkspace:async()=>({...context,membership:{role:'interviewer',status:'active'}}),updateRecord:async()=>assert.fail('Unexpected write')};
 assert.match((await load('app/dashboard/jobs/actions.js',options).updateJobAction({},form({}))).error,/permission/);
 assert.match((await load('app/dashboard/settings/actions.js',options).saveWorkspaceAction({},form({}))).error,/owners and admins/);
});
const interview={title:'Interview',interview_type:'technical',jobId:'j1',candidateId:'c1',applicationId:'a1',starts_at:'2026-10-10T10:00:00Z',ends_at:'2026-10-10T11:00:00Z'};
test('Scheduling returns actionable errors for invalid dates and mismatched applications',async()=>{
 const action=load('app/dashboard/interviews/actions.js');
 assert.match((await action.createInterviewAction({},form({...interview,ends_at:'bad-date'}))).error,/end time/);
 assert.match((await action.createInterviewAction({},form(interview))).error,/application.*available/);
});
test('Scheduling preserves explicit UTC time and reports persistence failures',async()=>{
 let payload;
 const action=load('app/dashboard/interviews/actions.js',{listRecords:async()=>({items:[{status:'active'}]}),createRecord:async(collection,data)=>{payload=data;throw Error('offline')}});
 assert.match((await action.createInterviewAction({},form(interview))).error,/could not be saved/);
 assert.equal(Date.parse(payload.starts_at),Date.parse(interview.starts_at));
});
test('Pool add failures redirect with an error notice instead of silently succeeding',async()=>{
 const action=load('app/dashboard/talent-pool/actions.js',{listRecords:async c=>({items:c==='talent_pool_members'?[]:[{id:'found'}]}),createRecord:async()=>{throw Error('offline')}});
 await assert.rejects(action.addPoolMemberAction(form({poolId:'p1',candidateId:'c1'})),/notice=failed/);
});
test('Workspace settings validate URLs and persist profile fields',async()=>{
 let patch;
 const action=load('app/dashboard/settings/actions.js',{updateRecord:async(c,id,data)=>{patch=data}});
 assert.match((await action.saveWorkspaceAction({},form({name:'Acme',company_size:'1-10',website:'javascript:alert(1)'}))).error,/valid website/);
 assert.equal((await action.saveWorkspaceAction({},form({name:'Updated',company_size:'11-50',website:'https://example.com'}))).message,'Workspace updated.');assert.equal(patch.name,'Updated');
});
test('Team invitations reject privileged roles and create a pending shareable invitation',async()=>{
 let saved;
 const action=load('app/dashboard/settings/actions.js',{createRecord:async(c,data)=>{saved=data}});
 assert.match((await action.inviteMemberAction({},form({name:'Person',email:'person@example.com',role:'owner'}))).error,/access role/);
 const result=await action.inviteMemberAction({},form({name:'Person',email:'PERSON@example.com',role:'recruiter'}));assert.match(result.path,/\/dashboard\/join\/[a-f0-9]{32}$/);assert.equal(saved.status,'invited');assert.equal(saved.email,'person@example.com');
});
test('Invitation acceptance requires the matching verified email and rejects expired links',async()=>{
 let writes=0;
 const invite={id:'m1',email:'person@example.com',created:new Date().toISOString()};
 const deps={listRecords:async(_c,options)=>({items:options.filter.includes('invite:')?[invite]:[]}),updateRecord:async()=>{writes++}};
 const fd=form({token:'a'.repeat(32)});
 const wrong=load('app/dashboard/join/[token]/actions.js',{...deps,currentUser:async()=>({emailAddresses:[{emailAddress:'wrong@example.com',verification:{status:'verified'}}]})});
 assert.match((await wrong.acceptInviteAction({},fd)).error,/verified email/);assert.equal(writes,0);
 const correct=load('app/dashboard/join/[token]/actions.js',deps);
 await assert.rejects(correct.acceptInviteAction({},fd),/REDIRECT:\/dashboard/);assert.equal(writes,1);
 invite.created='2020-01-01';assert.match((await correct.acceptInviteAction({},fd)).error,/expired/);assert.equal(writes,1);
});

test('Public application rejects unverified or mismatched emails before database registration',async()=>{
 for(const identity of [null,{userId:'attacker',emails:['attacker@example.com']}]){
  let calls=0;const action=load('app/interview/apply/[token]/actions.js',{candidateIdentity:async()=>identity,pbRequest:async()=>{calls++}});
  await assert.rejects(action.startPublicInterviewAction(form({token:'a'.repeat(44),email:'victim@example.com',first_name:'Victim',consent:'yes'})),/notice=verify/);assert.equal(calls,0);
 }
});
test('Team management blocks self, owners, other workspaces and admin escalation',async()=>{
 const run=async(member,currentRole='admin',targetRole='recruiter')=>{
  let writes=0;const action=load('app/dashboard/settings/actions.js',{requireWorkspace:async()=>({...context,membership:{role:currentRole,status:'active'}}),listRecords:async()=>({items:member?[member]:[]}),updateRecord:async()=>{writes++}});
  const result=await action.manageMemberAction({},form({membershipId:'m1',role:targetRole,status:'disabled'}));return {result,writes};
 };
 for(const member of [null,{id:'m1',role:'owner',status:'active',clerk_user_id:'other'},{id:'m1',role:'recruiter',status:'active',clerk_user_id:'user1'},{id:'m1',role:'admin',status:'active',clerk_user_id:'other'}]){const r=await run(member);assert.ok(r.result.error);assert.equal(r.writes,0);}
 const allowed=await run({id:'m1',role:'interviewer',status:'active',clerk_user_id:'other'},'owner');assert.equal(allowed.writes,1);assert.ok(allowed.result.message);
});
