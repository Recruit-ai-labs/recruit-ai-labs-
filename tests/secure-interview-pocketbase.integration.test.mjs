import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const env={};for(const line of fs.readFileSync(new URL('../.env.local',import.meta.url),'utf8').split(/\r?\n/)){const m=line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);if(m)env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');}
const base=env.POCKETBASE_URL||env.NEXT_PUBLIC_POCKETBASE_URL;
test('secure interview transaction, identity, expiry, rate limit and campaign revocation',async()=>{
 const auth=await fetch(base+'/api/collections/_superusers/auth-with-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identity:env.POCKETBASE_ADMIN_EMAIL,password:env.POCKETBASE_ADMIN_PASSWORD})});assert.equal(auth.status,200);const{token}=await auth.json();
 const headers={Authorization:token,'Content-Type':'application/json'};
 const request=(p,body,method='POST')=>fetch(base+p,{method,headers,...(body?{body:JSON.stringify(body)}:{})});
 const create=async(c,data)=>{const r=await request('/api/collections/'+c+'/records',data);const body=await r.json();assert.equal(r.status,200,JSON.stringify(body));return body;};
 const fixture='secure-'+crypto.randomUUID();let workspace;const limitKeys=[];
 try{
  workspace=await create('workspaces',{name:'Security integration fixture',slug:fixture,company_size:'1-10',hiring_goal:'build-team',created_by_clerk_id:fixture});
  const job=await create('jobs',{workspace:workspace.id,title:'Security test role',created_by_clerk_id:fixture,status:'open',openings:1,must_have_skills:['JavaScript']});
  const campaignToken=crypto.randomUUID().replaceAll('-','')+'a'.repeat(12);
  limitKeys.push('apply-user:'+fixture,'apply-campaign:'+campaignToken,'complete:'+fixture,'event:'+fixture);
  const campaign=await create('interview_campaigns',{workspace:workspace.id,job:job.id,title:'Security test interview',created_by_clerk_id:fixture,status:'active',token:campaignToken});
  const body={token:campaignToken,userId:fixture,email:fixture+'@example.com',first_name:'Synthetic',consent:true,inviteToken:crypto.randomUUID().replaceAll('-','')+'b'.repeat(12)};
  const anonymous=await fetch(base+'/api/recruit/interview/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});assert.ok([401,403].includes(anonymous.status));
  let response=await request('/api/recruit/interview/register',body);let payload=await response.json();assert.equal(response.status,200,JSON.stringify(payload));assert.equal(payload.token,body.inviteToken);
  response=await request('/api/recruit/interview/register',body);payload=await response.json();assert.equal(response.status,200,JSON.stringify(payload));assert.equal(payload.token,body.inviteToken,'Repeated application reuses session');
  const list=await request('/api/collections/interviews/records?filter='+encodeURIComponent('workspace = "'+workspace.id+'"'),null,'GET');const interview=(await list.json()).items[0];assert.ok(interview.candidate_questions.length);assert.equal(interview.campaign,campaign.id);
  const answers=Object.fromEntries(interview.candidate_questions.map(q=>[q.id,'I implemented reliable systems and tested the outcomes carefully.']));
  const submission={token:body.inviteToken,email:body.email,userId:fixture,answers};
  response=await request('/api/recruit/interview/complete',{...submission,email:'someone-else@example.com'});assert.equal(response.status,403);
  response=await request('/api/recruit/interview/complete',{...submission,answers:{}});assert.equal(response.status,400);
  await request('/api/collections/applications/records/'+interview.application,{stage:'interview'},'PATCH');
  response=await request('/api/recruit/interview/event',{...submission,event:'tab-hidden'});assert.equal(response.status,200,await response.text());
  const completions=await Promise.all([request('/api/recruit/interview/complete',submission),request('/api/recruit/interview/complete',submission)]);for(const completed of completions){payload=await completed.json();assert.equal(completed.status,200,JSON.stringify(payload));assert.equal(payload.completed,true);}
  response=await request('/api/recruit/interview/complete',submission);assert.equal(response.status,200,'Completion is idempotent');
  const saved=await (await request('/api/collections/interviews/records/'+interview.id,null,'GET')).json();assert.equal(saved.status,'completed');assert.equal(saved.integrity_events.length,1);
  const application=await (await request('/api/collections/applications/records/'+interview.application,null,'GET')).json();assert.equal(application.stage,'interview','Later stage is never moved backwards');
  await request('/api/collections/interviews/records/'+interview.id,{status:'scheduled',candidate_submitted_at:''},'PATCH');
  await request('/api/collections/candidates/records/'+interview.candidate,{consent_status:'withdrawn'},'PATCH');response=await request('/api/recruit/interview/complete',submission);assert.equal(response.status,403);
  await request('/api/collections/candidates/records/'+interview.candidate,{consent_status:'obtained'},'PATCH');await request('/api/collections/interviews/records/'+interview.id,{candidate_invite_expires_at:'2020-01-01T00:00:00Z'},'PATCH');response=await request('/api/recruit/interview/complete',submission);assert.equal(response.status,403);
  await request('/api/collections/interviews/records/'+interview.id,{candidate_invite_expires_at:new Date(Date.now()+86400000).toISOString()},'PATCH');await request('/api/collections/interview_campaigns/records/'+campaign.id,{status:'closed'},'PATCH');response=await request('/api/recruit/interview/complete',submission);assert.equal(response.status,403);
  for(let i=0;i<10;i++)response=await request('/api/recruit/interview/register',body);assert.equal(response.status,429,'Verified accounts are rate limited');
 }finally{
  if(workspace)await request('/api/collections/workspaces/records/'+workspace.id,null,'DELETE');
  const limits=await (await request('/api/collections/request_limits/records?perPage=500',null,'GET')).json();for(const row of limits.items||[])if(row.key.includes(fixture)||limitKeys.includes(row.key))await request('/api/collections/request_limits/records/'+row.id,null,'DELETE');
 }
});
