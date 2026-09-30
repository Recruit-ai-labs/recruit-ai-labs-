'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DemoForm({ waitlist = false, entry = null }) {
  const router = useRouter();
  const [state, setState] = useState('idle');
  const [message, setMessage] = useState('');
  const submitting = useRef(false);
  async function submit(event) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setState('sending'); setMessage('');
    const form = event.currentTarget;
    try {
      const response = await fetch(waitlist ? '/api/waiting-list' : '/api/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))), signal: AbortSignal.timeout(20000) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to send your request. Please try again.');
      setState('sent'); setMessage(waitlist ? 'Our team is reviewing your access request and will notify you by email once it’s approved.' : 'Thanks, our team will reach you soon.'); if (!waitlist) form.reset();
      if (waitlist) router.refresh();
    } catch (error) {
      setState('error'); setMessage(error.name === 'TimeoutError' ? 'The request timed out. Please try again or email us directly.' : error.message || 'Unable to send. Please try again.');
    } finally { submitting.current = false; }
  }
  return <form className="demoForm" onSubmit={submit}>
    <h3>{waitlist ? entry?.submitted_at ? 'Your application details' : 'Tell us about your team' : 'Book a demo'}</h3><p>{waitlist ? 'Help us understand your hiring needs. We will review your request personally.' : 'A little context helps us make it useful for you.'}</p>
    <div className="demoFormGrid"><label>Full name<input name="name" autoComplete="name" required maxLength={100} placeholder="Your name" defaultValue={entry?.name || ''} /></label><label>Work email<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@company.com" defaultValue={entry?.email || ''} readOnly={waitlist} /></label><label>Company<input name="company" autoComplete="organization" required maxLength={160} placeholder="Company name" defaultValue={entry?.company || ''} /></label><label>Phone <small>(optional)</small><input name="phone" type="tel" autoComplete="tel" maxLength={30} placeholder="+91" defaultValue={entry?.phone || ''} /></label></div>
    <label>Hiring volume<select name="volume" required defaultValue={entry?.volume || ''}><option value="" disabled>Select your monthly hiring needs</option><option>1-5 hires / month</option><option>6-20 hires / month</option><option>21-50 hires / month</option><option>50+ hires / month</option><option>Just exploring</option></select></label>
    <label>{waitlist ? 'Tell us about your hiring needs' : 'What would you like to explore?'}<textarea name="message" required minLength={10} maxLength={3000} rows={4} placeholder="Tell us about your roles, team or hiring challenges..." defaultValue={entry?.message || ''} /></label>
    <div className="demoTrap" aria-hidden="true" hidden style={{ display: 'none' }}><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <label className="demoConsent"><input name="consent" type="checkbox" required value="yes" defaultChecked={Boolean(entry?.submitted_at)} /><span>{waitlist ? 'I agree to be contacted about my waiting list application and access approval using these details.' : 'I agree to be contacted about my demo request using these details.'}</span></label>
    <button className="gradientBtn" type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Saving your request...' : waitlist ? entry?.submitted_at || state === 'sent' ? 'Update my details →' : 'Submit my application →' : 'Request my demo ->'}</button>
    {state === 'sent' && (waitlist ? <div className="waitReviewStatus" role="status" aria-live="polite"><span className="waitReviewIcon" aria-hidden="true">✓</span><div><strong>Access request received</strong><p>{message}</p></div></div> : <p className="demoFormStatus sent" role="status" aria-live="polite"><span aria-hidden="true">✓</span>{message}</p>)}
    {state === 'error' && <p className="demoFormStatus error" role="alert">{message}</p>}
    <small>Prefer email? <a href="mailto:hello@recruitailabs.in">Contact us directly -></a></small>
  </form>;
}
