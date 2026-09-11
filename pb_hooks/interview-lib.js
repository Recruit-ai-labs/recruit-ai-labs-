function json(record,key){const value=JSON.parse(record.getString(key)||'[]');return Array.isArray(value)?value:[];}
function find(app,collection,filter,params){return app.findRecordsByFilter(collection,filter,'',1,0,params)[0];}
function limit(app,key,max,windowMs){
 let allowed=true;
 app.runInTransaction(tx=>{let r=find(tx,'request_limits','key = {:key}',{key});const now=Date.now();if(!r){r=new Record(tx.findCollectionByNameOrId('request_limits'));r.set('key',key);r.set('reset_at',now+windowMs);r.set('count',0);}if(r.getFloat('reset_at')<=now){r.set('reset_at',now+windowMs);r.set('count',0);}if(r.getInt('count')>=max){allowed=false;return;}r.set('count',r.getInt('count')+1);tx.save(r);});
 if(!allowed)throw new TooManyRequestsError('Too many requests. Please try again later.');
}
function eligible(app,i,email,allowCompleted){
 const c=app.findRecordById('candidates',i.getString('candidate'));
 const a=app.findRecordById('applications',i.getString('application'));
 const job=app.findRecordById('jobs',i.getString('job'));
 if(c.getString('email').toLowerCase()!==email.toLowerCase()||c.getString('workspace')!==i.getString('workspace')||a.getString('candidate')!==c.id||a.getString('job')!==job.id||a.getString('workspace')!==i.getString('workspace'))throw new ForbiddenError('This interview is not available to this account.');
 if(c.getString('status')!=='active'||c.getString('consent_status')!=='obtained'||a.getString('status')!=='active'||['hired','rejected','offer'].includes(a.getString('stage')))throw new ForbiddenError('This application is no longer available. Contact the hiring team.');
 if(!Number.isFinite(Date.parse(i.getString('candidate_invite_expires_at')))||Date.parse(i.getString('candidate_invite_expires_at'))<=Date.now())throw new ForbiddenError('This interview link has expired.');
 if(i.getString('campaign')){const campaign=app.findRecordById('interview_campaigns',i.getString('campaign'));if(campaign.getString('status')!=='active'||job.getString('status')!=='open')throw new ForbiddenError('This interview link is closed.');}
 if(i.getString('status')!=='scheduled'&&!(allowCompleted&&i.getString('status')==='completed'))throw new ForbiddenError('This interview is unavailable.');
 return {candidate:c,application:a};
}
module.exports={json,find,limit,eligible};
