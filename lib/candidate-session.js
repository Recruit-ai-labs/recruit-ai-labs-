import 'server-only';
import {auth,currentUser} from '@clerk/nextjs/server';
import {getRecord,listRecords,pbFilterValue} from './pocketbase';
export async function candidateIdentity() {
 const {userId}=await auth();if(!userId)return null;
 const user=await currentUser();const emails=(user?.emailAddresses||[]).filter(e=>e.verification?.status==='verified').map(e=>e.emailAddress.toLowerCase());
 return emails.length?{userId,emails}:null;
}
export async function candidateSession(token) {
 if(!/^[a-f0-9]{44}$/.test(token))return null;
 const identity=await candidateIdentity();if(!identity)return null;
 const result=await listRecords('interviews',{filter:`candidate_invite_token = "${pbFilterValue(token)}"`,perPage:1});const interview=result.items?.[0];if(!interview)return null;
 const candidate=await getRecord('candidates',interview.candidate);if(!identity.emails.includes(candidate.email.toLowerCase()))return null;
 const application=await getRecord('applications',interview.application);
 if(candidate.status!=='active'||candidate.consent_status!=='obtained'||application.status!=='active'||['hired','rejected','offer'].includes(application.stage)||!Number.isFinite(Date.parse(interview.candidate_invite_expires_at))||Date.parse(interview.candidate_invite_expires_at)<=Date.now())return null;
 if(interview.campaign){const campaign=await getRecord('interview_campaigns',interview.campaign);const job=await getRecord('jobs',interview.job);if(campaign.status!=='active'||job.status!=='open')return null;}
 return {...identity,email:candidate.email.toLowerCase(),interview};
}
