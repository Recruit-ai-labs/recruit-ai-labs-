import {auth} from '@clerk/nextjs/server';
import {candidateIdentity} from '../../../../lib/candidate-session';
import CandidateSignIn from '../../../components/CandidateSignIn';
import { notFound } from 'next/navigation';
import { listRecords, pbFilterValue } from '../../../../lib/pocketbase';
import { startPublicInterviewAction } from './actions';
import ApplySubmit from './ApplySubmit';
import './apply.css';

export default async function PublicInterviewApplicationPage({ params, searchParams }) {
  const { token } = await params;
  const query = await searchParams;
  if(!/^[a-f0-9]{44}$/.test(token))notFound();
  const identity=await candidateIdentity();
  if(!identity){const {userId}=await auth();return <CandidateSignIn signedIn={Boolean(userId)} path={'/interview/apply/'+token}/>;}
  if(query?.notice==='completed')return <p>Your interview has already been submitted. The hiring team will review your response.</p>;
  const campaigns = await listRecords('interview_campaigns', { filter: `token = "${pbFilterValue(token)}" && status = "active"`, perPage: 1 });
  const campaign = campaigns.items?.[0]; if (!campaign) notFound();
  const jobs = await listRecords('jobs', { filter: `id = "${pbFilterValue(campaign.job)}" && workspace = "${pbFilterValue(campaign.workspace)}" && status = "open"`, perPage: 1 });
  const job = jobs.items?.[0]; if (!job) notFound();
  return <main className="candidateWelcome">
    <header className="welcomeTop"><a href="/" aria-label="Recruit AI home">recruit<span>ai</span><i>®</i></a><span>YOUR NEXT CHAPTER STARTS HERE</span></header>
    <div className="welcomeLayout">
      <aside className="welcomeStory">
        <span className="welcomeBadge"><i/> CANDIDATE EXPERIENCE</span>
        <h1>Great work starts<br/>with a great<br/><em>conversation.</em></h1>
        <p>A space to share your experience, your ideas, and what makes you right for this role.</p>
        <div className="welcomeRole"><small>YOU’RE INTERVIEWING FOR</small><h2>{job.title}</h2><p>{[job.department,job.location,job.workplace_type].filter(Boolean).join(' · ')}</p></div>
        <ol className="welcomeSteps"><li className="current"><b>01</b><div><strong>Your details</strong><span>A quick introduction to you</span></div><i>NOW</i></li><li><b>02</b><div><strong>Get comfortable</strong><span>Check your camera and microphone</span></div></li><li><b>03</b><div><strong>Meet Ava &amp; begin</strong><span>Your AI interviewer will guide you</span></div></li></ol>
        <footer>Thoughtfully built for your next opportunity.</footer>
      </aside>
      <section className="welcomeFormCard">
        <div className="welcomeFormHeading"><span>LET’S GET ACQUAINTED</span><h2>First, a little about you.</h2><p>Confirm your details before we get started.</p></div>
        {campaign.intro && <details className="welcomeInstructions"><summary>Instructions from your hiring team</summary><p>{campaign.intro}</p></details>}
        {query?.notice==='invalid'&&<p className="welcomeError" role="alert">Enter a valid name and email, and confirm your consent.</p>}
        {query?.notice==='contact-team'&&<p className="welcomeError" role="alert">Please contact the hiring team for help with this application.</p>}
        {query?.notice && ["verify","unavailable","rate-limited"].includes(query.notice) && <p role="alert" className="welcomeError">{query.notice==="verify"?"Use a verified email on your signed-in account.":query.notice==="rate-limited"?"Too many requests. Please wait before trying again.":"This application cannot continue. Contact the hiring team or retry later."}</p>}<form action={startPublicInterviewAction}>
          <input type="hidden" name="token" value={token}/>
          <div className="welcomeFieldPair"><label>First name <span>*</span><input name="first_name" required maxLength={100} autoComplete="given-name" placeholder="First name"/></label><label>Last name<input name="last_name" maxLength={100} autoComplete="family-name" placeholder="Last name"/></label></div>
          <label>Email address <span>*</span><select name="email" required>{identity.emails.map(email=><option key={email}>{email}</option>)}</select><small>Use the email where you’d like to receive hiring updates.</small></label>
          <div className="welcomeFieldPair"><label>Phone number <em>Optional</em><input name="phone" type="tel" maxLength={40} autoComplete="tel" placeholder="+91"/></label><label>Location <em>Optional</em><input name="location" maxLength={160} autoComplete="address-level2" placeholder="City, country"/></label></div>
          <label className="welcomeConsent"><input name="consent" type="checkbox" value="yes" required/><span>I consent to Recruit AI storing and processing my details for this job application.</span></label>
          <ApplySubmit/>
          <p className="welcomeNext">UP NEXT <span>Camera &amp; microphone check</span></p>
        </form>
      </section>
    </div>
    <footer className="welcomeBottom"><span>Recruit AI · Candidate interviews</span><span>Your experience. Your opportunity.</span></footer>
  </main>;
}
