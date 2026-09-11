import {auth} from '@clerk/nextjs/server';
import {candidateIdentity,candidateSession} from '../../../lib/candidate-session';
import {submitCandidateInterviewAction,recordInterviewEvent,requestInterviewFollowup} from './actions';
import CandidateSignIn from '../../components/CandidateSignIn';
import VoiceInterview from './VoiceInterview';
export default async function Page({params}) {
 const {token}=await params;const identity=await candidateIdentity();
 if(!identity){const {userId}=await auth();return <CandidateSignIn signedIn={Boolean(userId)} path={'/interview/'+token}/>;}
 const session=await candidateSession(token);
 if(!session)return <main className="voiceExperience"><section className="voicePanel"><h1>Interview unavailable</h1><p>This link is expired, closed, or belongs to a different email. Contact your hiring team or sign in with your invited account.</p></section></main>;
 const interview=session.interview;
 if(interview.status==='completed')return <main className="voiceExperience"><section className="voicePanel"><h1>Thank you. Your interview is submitted.</h1><p>Your answers have been saved for the hiring team.</p></section></main>;
 if(interview.status!=='scheduled')return <p>This interview is unavailable. Contact the hiring team.</p>;
 const questions=interview.candidate_questions||[];
 if(!questions.length)return <p>Questions are unavailable. Ask your hiring team to refresh the invitation.</p>;
 return <><section className="voicePanel"><h2>{interview.title}</h2>{interview.starts_at&&<p>Scheduled: {new Date(interview.starts_at).toLocaleString('en-IN',{timeZone:interview.timezone||'UTC'})} ({interview.timezone||'UTC'})</p>}{/^https?:\/\//i.test(interview.meeting_url||'')&&<a href={interview.meeting_url} target="_blank" rel="noopener noreferrer">Open meeting link</a>}</section><VoiceInterview token={token} title={interview.title} questions={questions} submit={submitCandidateInterviewAction} recordEvent={recordInterviewEvent} requestFollowup={requestInterviewFollowup}/></>;
}
