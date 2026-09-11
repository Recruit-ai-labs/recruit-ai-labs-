routerAdd('POST','/api/recruit/interview/register',(e)=>{
 const h=require(__hooks+'/interview-lib.js'),b=e.requestInfo().body;
 if(!/^[a-f0-9]{44}$/.test(b.token||'')||!b.userId||!b.email||!b.first_name||b.consent!==true)throw new BadRequestError('Verified applicant details are required.');
 h.limit(e.app,'apply-user:'+b.userId,10,15*60000);h.limit(e.app,'apply-campaign:'+b.token,500,60*60000);
 let result;
 e.app.runInTransaction(tx=>{
  const campaign=h.find(tx,'interview_campaigns','token = {:token} && status = "active"',{token:b.token});if(!campaign)throw new NotFoundError('This application link is closed.');
  const job=tx.findRecordById('jobs',campaign.getString('job')),workspace=campaign.getString('workspace');if(job.getString('status')!=='open')throw new BadRequestError('This job is not accepting applications.');
  let candidate=h.find(tx,'candidates','workspace = {:w} && email = {:email}',{w:workspace,email:b.email.toLowerCase()});
  if(candidate&&(candidate.getString('status')!=='active'||candidate.getString('consent_status')==='withdrawn'))throw new ForbiddenError('Contact the hiring team for help with this application.');
  if(!candidate){candidate=new Record(tx.findCollectionByNameOrId('candidates'));candidate.load({workspace,created_by_clerk_id:b.userId,first_name:String(b.first_name).slice(0,100),last_name:String(b.last_name||'').slice(0,100),email:b.email.toLowerCase(),phone:String(b.phone||'').slice(0,40),location:String(b.location||'').slice(0,160),source:'career-site',status:'active',resume_parse_status:'not-started'});}
  candidate.set('consent_status','obtained');candidate.set('consent_at',new Date().toISOString());tx.save(candidate);
  let application=h.find(tx,'applications','workspace = {:w} && job = {:j} && candidate = {:c}',{w:workspace,j:job.id,c:candidate.id});
  if(application&&(application.getString('status')!=='active'||['hired','rejected','offer'].includes(application.getString('stage'))))throw new ForbiddenError('Contact the hiring team about your existing application.');
  if(!application){application=new Record(tx.findCollectionByNameOrId('applications'));application.load({workspace,job:job.id,candidate:candidate.id,stage:'new',status:'active',applied_at:new Date().toISOString()});tx.save(application);}
  let interview=h.find(tx,'interviews','application = {:a} && campaign = {:camp} && status != "cancelled"',{a:application.id,camp:campaign.id});
  if(interview&&interview.getString('status')==='completed'){result={completed:true};return;}
  if(interview&&Date.parse(interview.getString('candidate_invite_expires_at'))<=Date.now())throw new ForbiddenError('Your interview has expired. Contact the hiring team.');
  if(!interview){interview=new Record(tx.findCollectionByNameOrId('interviews'));const skills=h.json(job,'must_have_skills').slice(0,3);interview.load({workspace,job:job.id,candidate:candidate.id,application:application.id,campaign:campaign.id,title:campaign.getString('title'),interview_type:'screening',status:'scheduled',candidate_invite_token:$security.randomString(44).toLowerCase(),candidate_invite_expires_at:new Date(Date.now()+7*86400000).toISOString(),candidate_questions:[{id:'experience',prompt:'Describe your most relevant experience for '+job.getString('title')+'.',required:true},...skills.map((skill,index)=>({id:'skill-'+index,prompt:'Describe a real project where you used '+skill+'. What was your contribution and result?',required:true})),{id:'motivation',prompt:'Why is this role a good fit for you?',required:true}],candidate_answers:[]});
   // Hex token supplied by trusted server to keep the public route format stable.
   if(!/^[a-f0-9]{44}$/.test(b.inviteToken||''))throw new BadRequestError('Invalid session token.');interview.set('candidate_invite_token',b.inviteToken);tx.save(interview);
  }
  result={token:interview.getString('candidate_invite_token')};
 });return e.json(200,result);
},$apis.requireSuperuserAuth());

routerAdd('POST','/api/recruit/interview/{operation}',(e)=>{
 const h=require(__hooks+'/interview-lib.js'),b=e.requestInfo().body,operation=e.request.pathValue('operation');
 if(!['complete','event','followup'].includes(operation)||!b.email||!b.userId||!/^[a-f0-9]{44}$/.test(b.token||''))throw new BadRequestError('Invalid interview request.');
 h.limit(e.app,operation+':'+b.userId,operation==='event'?120:15,15*60000);
 let result={completed:false};
 e.app.runInTransaction(tx=>{
  const interview=h.find(tx,'interviews','candidate_invite_token = {:token}',{token:b.token});if(!interview)throw new NotFoundError('Interview not found.');
  const state=h.eligible(tx,interview,b.email,true);
  if(interview.getString('status')==='completed'){result={completed:true};return;}
  if(operation==='event'){
   if(!['tab-hidden','fullscreen-exit'].includes(b.event))throw new BadRequestError('Invalid event.');const events=h.json(interview,'integrity_events');events.push({type:b.event,at:new Date().toISOString(),source:'browser'});interview.set('integrity_events',events.slice(-100));tx.save(interview);return;
  }
  if(operation==='followup'){
   const questions=h.json(interview,'candidate_questions'),prompt=String(b.prompt||'').trim();if(prompt.length<15||prompt.length>240||questions.filter(q=>q.adaptive).length>=3)throw new BadRequestError('Invalid follow-up.');
   const question={id:'adaptive-'+$security.randomString(12).toLowerCase(),prompt,required:true,adaptive:true,parent_id:String(b.parentId||'').slice(0,80)};questions.push(question);interview.set('candidate_questions',questions);tx.save(interview);result={question};return;
  }
  const questions=h.json(interview,'candidate_questions');if(!questions.length)throw new BadRequestError('Interview questions are missing.');
  const answers=questions.map(q=>{const answer=String((b.answers||{})[q.id]||'').trim();if(answer.length<20||answer.length>5000)throw new BadRequestError('Each answer must have 20–5000 characters.');return {question_id:q.id,prompt:q.prompt,answer};});
  const now=new Date().toISOString();interview.set('candidate_answers',answers);interview.set('candidate_submitted_at',now);interview.set('status','completed');tx.save(interview);
  const application=state.application;if(application.getString('stage')==='new'){application.set('stage','screening');application.set('stage_changed_at',now);}application.set('last_activity_at',now);tx.save(application);
  const activity=new Record(tx.findCollectionByNameOrId('activities'));activity.load({workspace:interview.getString('workspace'),actor_clerk_user_id:b.userId,entity_type:'interview',entity_id:interview.id,action:'interview.candidate_completed',metadata:{applicationId:application.id}});tx.save(activity);result={completed:true};
 });return e.json(200,result);
},$apis.requireSuperuserAuth());

cronAdd('prune_request_limits','0 * * * *',()=>{$app.db().newQuery('DELETE FROM request_limits WHERE reset_at < {:now}').bind({now:Date.now()-86400000}).execute();});
