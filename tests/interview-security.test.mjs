import test from 'node:test';import assert from 'node:assert/strict';
import {validateInterviewEvaluation,buildInterviewQuestions,canSubmitScorecard} from '../lib/interview-validation.mjs';
test('interview AI strips fabricated quotes and malformed nested values',()=>{
 const result=validateInterviewEvaluation({recommendation:'strong-yes',confidence:.99,summary:'Excellent',strengths:[{claim:'Invented experience',evidence:'Led a team of 100 people'},null,{claim:{bad:true},evidence:'I built reliable software'}],risks:[{claim:'Unsupported risk',evidence:{bad:true}}],skill_signals:[null,{skill:{bad:true}},{skill:'JavaScript',status:'supported',evidence:'Invented quote'}]},[{answer:'I built reliable software using JavaScript.'}]);
 assert.deepEqual(result.strengths,[]);assert.deepEqual(result.risks,[]);assert.equal(result.skill_signals[0].status,'unclear');assert.equal(result.recommendation,'mixed');assert.ok(result.confidence<=.5);
});
test('interview AI preserves actual evidence and rejects invalid top-level values',()=>{
 const result=validateInterviewEvaluation({recommendation:'yes',confidence:.8,summary:'Relevant evidence',strengths:[{claim:'Built software',evidence:'I built reliable software'}],risks:[],skill_signals:[]},[{answer:'I built reliable software using JavaScript.'}]);assert.equal(result.strengths.length,1);assert.equal(result.recommendation,'yes');assert.throws(()=>validateInterviewEvaluation({recommendation:'yes',confidence:'1',summary:'bad'},[]));
});
test('direct invite question generation always creates usable questions',()=>{const q=buildInterviewQuestions({title:'Engineer',must_have_skills:['JavaScript','SQL']});assert.equal(q.length,4);assert.equal(new Set(q.map(x=>x.id)).size,q.length);assert.ok(q.every(x=>x.required&&x.prompt.length>20));});
test('active interviewers can score; disabled members cannot',()=>{assert.equal(canSubmitScorecard({role:'interviewer',status:'active'}),true);assert.equal(canSubmitScorecard({role:'hiring-manager',status:'active'}),true);assert.equal(canSubmitScorecard({role:'interviewer',status:'disabled'}),false);});
