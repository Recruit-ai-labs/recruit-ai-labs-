import { redirect } from 'next/navigation';
import { requireAccessIdentity, accessService } from '../../lib/access';
import { APPROVAL_ADMIN } from '../../lib/access-core.mjs';
import DemoForm from '../demo/DemoForm';
import AccessSignOut from '../components/AccessSignOut';
import '../demo/demo.css';
import '../demo/grain.css';
import './waiting-list.css';

export const metadata = { title: 'Your waiting list spot | Recruit AI', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';
export default async function WaitingListPage() {
  const { email } = await requireAccessIdentity();
  if (email === APPROVAL_ADMIN) redirect('/approval-portal');
  const row = await accessService().ensureRequest(email);
  const entry = { ...row, number: Number(row.number) }, approved = entry.status === 'approved';
  return <main className="demoPage waitingPage">
    <header className="nav"><a className="logo" href="/"><span><img src="/recruit-ai-logo.png" alt="" /></span>Recruit <i>AI</i></a><nav aria-label="Waiting list navigation"><a href="#application">Your application</a><a href="/demo">Product guide</a></nav><AccessSignOut /></header>
    <section className="demoHero"><p className="available"><b />{approved ? 'YOUR ACCESS IS APPROVED' : 'YOU’RE ON THE WAITING LIST'}</p><h1>{approved ? 'Your next chapter' : 'Great hiring is'}<br /><em>{approved ? 'starts here.' : 'worth the wait.'}</em></h1><p>{approved ? 'Your application is approved. Sign in with a fresh email code to open your workspace.' : 'Your place is saved. Tell us about your team below, and we’ll email you as soon as your access is approved.'}</p>
      <div className="waitTicket"><div><span>YOUR WAITING LIST NUMBER</span><strong>#{String(entry.number).padStart(4, '0')}</strong></div><div><span className={`waitStatus ${approved ? 'isApproved' : ''}`}>{approved ? 'Access approved' : entry.submitted_at ? 'Under review' : 'Details needed'}</span><p>{email}</p><small>Your number stays the same when you return.</small></div></div>
      <div className="demoPills"><span>Personal review</span><span>Updates by email</span><span>A workspace built for your team</span></div>
    </section>
    <section id="application" className="demoBooking"><div><p className="reportEyebrow">YOUR NEXT STEP</p><h2>Your roles.<br />Your team.<br /><em>Your place in line.</em></h2><p>We’re welcoming hiring teams in small groups so every workspace gets a thoughtful start.</p><div className="demoAgenda"><b>What happens next</b><p>01 &nbsp; Share your team’s hiring needs</p><p>02 &nbsp; We review your application</p><p>03 &nbsp; Get your approval email and sign in</p></div><p>Your number identifies your application. Access is granted after review, rather than by a guaranteed date.</p><a className="demoEmail" href="mailto:hello@recruitailabs.in">Questions? Contact our team ↗</a></div>
      {approved ? <div className="demoForm waitApproved"><span className="waitCheck">✓</span><h3>You’re invited in.</h3><p>Your request #{String(entry.number).padStart(4, '0')} has been approved. Use the same email address to sign in.</p><a className="gradientBtn" href="/sign-in">Sign in to your workspace →</a></div> : <DemoForm waitlist entry={entry} />}
    </section><div className="demoFooter"><a className="logo" href="/">Recruit <i>AI</i></a><span>Good teams start with a conversation.</span><a href="/demo">Explore the product ↗</a></div>
  </main>;
}
