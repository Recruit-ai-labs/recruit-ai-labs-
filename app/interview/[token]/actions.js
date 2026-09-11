'use server';
import {candidateSession} from '../../../lib/candidate-session';
import {pbRequest} from '../../../lib/pocketbase';
import {generateAdaptiveFollowup} from '../../../lib/adaptive-interview';
export async function submitCandidateInterviewAction(fd) {
 const token=String(fd.get('token')||''),session=await candidateSession(token);
 if(!session)return {error:'This interview has expired, is closed, or does not belong to your verified account. Contact the hiring team.'};
 const answers=Object.fromEntries((session.interview.candidate_questions||[]).map(q=>[q.id,String(fd.get('answer-'+q.id)||'')]));
 try{return await pbRequest('/api/recruit/interview/complete',{method:'POST',body:JSON.stringify({token,email:session.email,userId:session.userId,answers})});}
 catch(error){return {error:error.status===429?'Too many attempts. Wait before trying again.':'Could not submit. Check your answers and retry; your draft is still available.'};}
}
export async function recordInterviewEvent(token,event) {
 if(!['tab-hidden','fullscreen-exit'].includes(event))return;
 try{const session=await candidateSession(token);if(!session)return;await pbRequest('/api/recruit/interview/event',{method:'POST',body:JSON.stringify({token,event,email:session.email,userId:session.userId})});}catch{}
}
export async function requestInterviewFollowup(token,questionId,answer) {
 try{const session=await candidateSession(token);if(!session||String(answer||'').trim().length<20)return null;const questions=session.interview.candidate_questions||[];if(questions.filter(q=>q.adaptive).length>=3)return null;const question=questions.find(q=>q.id===questionId);if(!question)return null;const followup=await generateAdaptiveFollowup({question:question.prompt,answer:String(answer).slice(0,5000),job:session.job,asked:questions.map(q=>q.prompt)});if(!followup)return null;return await pbRequest('/api/recruit/interview/followup',{method:'POST',body:JSON.stringify({token,email:session.email,userId:session.userId,parentId:questionId,prompt:followup.prompt})});}catch{return null}
}
