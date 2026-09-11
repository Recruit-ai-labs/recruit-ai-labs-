export function buildInterviewQuestions(job) {
 const skills=Array.isArray(job.must_have_skills)?job.must_have_skills.slice(0,3):[];
 return [{id:'experience',prompt:`Describe your most relevant experience for ${job.title}.`,required:true},...skills.map((skill,i)=>({id:`skill-${i}`,prompt:`Describe a project where you used ${skill}. What was your contribution and result?`,required:true})),{id:'motivation',prompt:'Why is this role a good fit for you?',required:true}];
}
export function canSubmitScorecard(membership) {
 return membership?.status==='active'&&['owner','admin','recruiter','hiring-manager','interviewer'].includes(membership.role);
}
export function validateInterviewEvaluation(data,answers) {
 if(!data||!['strong-no','no','mixed','yes','strong-yes'].includes(data.recommendation)||!Number.isFinite(data.confidence)||typeof data.summary!=='string')throw new Error('Invalid interview evaluation.');
 const corpus=(answers||[]).map(a=>String(a.answer||''));
 const quote=value=>typeof value==='string'&&value.trim().length>=8&&value.length<=1000&&corpus.some(answer=>answer.includes(value.trim()));
 const evidence=items=>(Array.isArray(items)?items:[]).filter(x=>x&&typeof x.claim==='string'&&x.claim.trim()&&quote(x.evidence)).slice(0,5).map(x=>({claim:x.claim.slice(0,500),evidence:x.evidence.trim()}));
 const strengths=evidence(data.strengths),risks=evidence(data.risks);
 const signals=(Array.isArray(data.skill_signals)?data.skill_signals:[]).filter(x=>x&&typeof x.skill==='string'&&x.skill.trim()).slice(0,10).map(x=>({skill:x.skill.slice(0,160),status:quote(x.evidence)&&['supported','unclear','not-demonstrated'].includes(x.status)?x.status:'unclear',evidence:quote(x.evidence)?x.evidence.trim():''}));
 const missing=!Array.isArray(data.strengths)||!Array.isArray(data.risks)||!Array.isArray(data.skill_signals)||(data.strengths.length!==strengths.length)||(data.risks.length!==risks.length)||data.skill_signals.length!==signals.length||signals.some(s=>!s.evidence)||(!strengths.length&&!risks.length&&!signals.some(s=>s.evidence));
 return {recommendation:missing?'mixed':data.recommendation,confidence:missing?Math.min(.5,Math.max(0,data.confidence)):Math.max(0,Math.min(1,data.confidence)),summary:missing?'Some AI claims could not be verified against the answers. Review the quoted evidence before deciding.':data.summary.slice(0,700),strengths,risks,skill_signals:signals};
}
