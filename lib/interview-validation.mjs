export function buildInterviewQuestions(job) {
 const skills=Array.isArray(job.must_have_skills)?job.must_have_skills.slice(0,3):[];
 return [{id:'experience',prompt:`Describe your most relevant experience for ${job.title}.`,required:true},...skills.map((skill,i)=>({id:`skill-${i}`,prompt:`Describe a project where you used ${skill}. What was your contribution and result?`,required:true})),{id:'motivation',prompt:'Why is this role a good fit for you?',required:true}];
}
export function canSubmitScorecard(membership) {
 return membership?.status==='active'&&['owner','admin','recruiter','hiring-manager','interviewer'].includes(membership.role);
}

const STOP_WORDS=new Set(['about','after','again','also','and','are','because','been','before','being','but','candidate','could','did','does','for','from','had','has','have','into','interview','its','more','most','not','our','out','over','role','said','should','some','than','that','the','their','them','then','there','these','they','this','through','under','used','using','very','was','were','what','when','where','which','while','with','would','your']);
const NEGATION=/\b(?:no|not|never|haven't|hasn't|hadn't|didn't|don't|doesn't|cannot|can't|without|unfamiliar|no experience|not worked|not used)\b/i;
const UNCERTAINTY=/\b(?:maybe|might|probably|I think|I guess|heard of|read about|learning|beginner|basic awareness)\b/i;
const PERSONAL_ACTION=/\bI\s+(?:analysed|analyzed|applied|architected|automated|built|configured|created|debugged|delivered|deployed|designed|developed|implemented|integrated|led|maintained|managed|migrated|monitored|operated|optimized|owned|secured|scaled|tested|used|wrote)\b/i;
const normalize=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/[^a-z0-9+#.\s-]/g,' ').replace(/\s+/g,' ').trim();
const tokens=value=>[...new Set(normalize(value).split(/\s+/).filter(x=>(x.length>2||/[+#]/.test(x))&&!STOP_WORDS.has(x)))];
const hasOverlap=(claim,evidence)=>{const wanted=tokens(claim),present=new Set(tokens(evidence));return wanted.length>0&&wanted.some(token=>present.has(token))};
const exactQuote=(value,answers)=>{
 if(typeof value!=='string')return null;
 const quote=value.trim();if(quote.length<12||quote.length>1000)return null;
 const match=answers.find(item=>String(item.answer||'').includes(quote));
 return match?{quote,answer:match}:null;
};
const skillFromPrompt=prompt=>{
 const match=String(prompt||'').match(/(?:used|use)\s+(.+?)(?:\.|\?|,|\s+what\b)/i);
 return match?.[1]?.trim()||'';
};
const unique=value=>[...new Set(value.filter(Boolean))];

export function validateInterviewEvaluation(data,answers) {
 if(!data||!['strong-no','no','mixed','yes','strong-yes'].includes(data.recommendation)||!Number.isFinite(data.confidence)||typeof data.summary!=='string')throw new Error('Invalid interview evaluation.');
 const rows=(Array.isArray(answers)?answers:[]).map(item=>({question_id:String(item.question_id||''),prompt:String(item.prompt||''),answer:String(item.answer||'')}));
 const evidence=items=>(Array.isArray(items)?items:[]).flatMap(item=>{
  if(!item||typeof item.claim!=='string'||!item.claim.trim())return[];
  const found=exactQuote(item.evidence,rows);
  if(!found||!hasOverlap(item.claim,found.quote))return[];
  return[{claim:item.claim.trim().slice(0,240),evidence:found.quote,question_id:found.answer.question_id}];
 }).slice(0,5);
 const strengths=evidence(data.strengths).filter(item=>!NEGATION.test(item.evidence)&&!UNCERTAINTY.test(item.evidence)&&PERSONAL_ACTION.test(item.evidence));
 const risks=evidence(data.risks);
 const expectedSkills=unique(rows.map(item=>skillFromPrompt(item.prompt))).slice(0,10);
 const proposed=Array.isArray(data.skill_signals)?data.skill_signals:[];
 const signals=expectedSkills.map(skill=>{
  const item=proposed.find(signal=>signal&&typeof signal.skill==='string'&&normalize(signal.skill)===normalize(skill));
  const found=item?exactQuote(item.evidence,rows):null;
  const belongsToSkillQuestion=found&&normalize(skillFromPrompt(found.answer.prompt))===normalize(skill);
  const namesSkill=found&&tokens(skill).some(token=>new Set(tokens(found.quote)).has(token));
  if(!found||!belongsToSkillQuestion||!namesSkill)return{skill,status:'unclear',evidence:''};
  if(NEGATION.test(found.quote))return{skill,status:'not-demonstrated',evidence:found.quote,question_id:found.answer.question_id};
  if(UNCERTAINTY.test(found.quote)||!PERSONAL_ACTION.test(found.quote))return{skill,status:'unclear',evidence:found.quote,question_id:found.answer.question_id};
  return{skill,status:item.status==='supported'?'supported':'unclear',evidence:found.quote,question_id:found.answer.question_id};
 });
 const supported=signals.filter(item=>item.status==='supported');
 const explicitGaps=signals.filter(item=>item.status==='not-demonstrated');
 const coverage=expectedSkills.length?supported.length/expectedSkills.length:0;
 const recommendation=expectedSkills.length&&coverage===1&&strengths.length>=1?'yes':'mixed';
 const confidence=Math.min(.9,Math.max(.2,expectedSkills.length?(.35+coverage*.45+(strengths.length?0.1:0)):.3));
 const summaryParts=[
  `${rows.length} interview answer${rows.length===1?' was':'s were'} reviewed.`,
  supported.length?`Evidence-backed skills: ${supported.map(item=>item.skill).join(', ')}.`:'No asked skill was confirmed by sufficiently specific transcript evidence.',
  explicitGaps.length?`Candidate explicitly reported limited or no evidence for: ${explicitGaps.map(item=>item.skill).join(', ')}.`:'',
  signals.some(item=>item.status==='unclear')?`Needs follow-up: ${signals.filter(item=>item.status==='unclear').map(item=>item.skill).join(', ')}.`:'',
  strengths.length?`Verified highlight: “${strengths[0].evidence.slice(0,220)}”`:'',
 ].filter(Boolean);
 return {recommendation,confidence,summary:summaryParts.join(' ').slice(0,700),strengths,risks,skill_signals:signals};
}
