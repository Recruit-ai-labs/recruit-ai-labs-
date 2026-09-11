migrate((app) => {
  const candidates=app.findCollectionByNameOrId('candidates');
  candidates.fields.getByName('resume').protected=true;app.save(candidates);
  const interviews=app.findCollectionByNameOrId('interviews');
  const campaign=app.findCollectionByNameOrId('interview_campaigns');
  if(!interviews.fields.getByName('candidate_invite_expires_at'))interviews.fields.add(new DateField({name:'candidate_invite_expires_at'}));
  if(!interviews.fields.getByName('campaign'))interviews.fields.add(new RelationField({name:'campaign',collectionId:campaign.id,maxSelect:1,cascadeDelete:false}));
  app.save(interviews);
  const rows=app.findRecordsByFilter('interviews','candidate_invite_token != ""','',0,0);
  for(const row of rows){
    if(!row.getString('candidate_invite_expires_at'))row.set('candidate_invite_expires_at',new Date(Date.now()+7*86400000).toISOString());
    if(!JSON.parse(row.getString('candidate_questions')||'[]')?.length){
      const job=app.findRecordById('jobs',row.getString('job'));
      row.set('candidate_questions',[{id:'experience',prompt:'Describe your most relevant experience for '+job.getString('title')+'.',required:true},{id:'impact',prompt:'Describe a project, your contribution and its measurable outcome.',required:true},{id:'motivation',prompt:'Why is this role a good fit for you?',required:true}]);
    }
    const events=app.findRecordsByFilter('activities','action = "candidate.public_interview_application_created" && metadata.interviewId = {:id}','',1,0,{id:row.id});
    if(events.length){const meta=JSON.parse(events[0].getString('metadata')||'{}');if(meta.campaignId)row.set('campaign',meta.campaignId);}
    app.save(row);
  }
  const limits=new Collection({name:'request_limits',type:'base',listRule:null,viewRule:null,createRule:null,updateRule:null,deleteRule:null,fields:[{type:'text',name:'key',required:true,max:200},{type:'number',name:'count'},{type:'number',name:'reset_at'}],indexes:['CREATE UNIQUE INDEX idx_request_limits_key ON request_limits (key)']});app.save(limits);
},(app)=>{
  // Resume protection is intentionally retained when rolling back this migration.
  const c=app.findCollectionByNameOrId('interviews');for(const n of ['campaign','candidate_invite_expires_at']){const f=c.fields.getByName(n);if(f)c.fields.removeById(f.id);}app.save(c);
  app.delete(app.findCollectionByNameOrId('request_limits'));
});
