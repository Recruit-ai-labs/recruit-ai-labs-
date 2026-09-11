'use client';
import {useRef,useState} from 'react';

export default function DemoForm(){
  const [state,setState]=useState('idle'),[message,setMessage]=useState('');
  const submitting=useRef(false);
  async function submit(event){
    event.preventDefault();if(submitting.current)return;submitting.current=true;setState('sending');setMessage('');
    const form=event.currentTarget;
    try{const response=await fetch('/api/demo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form))),signal:AbortSignal.timeout(20000)});const data=await response.json();if(!response.ok)throw new Error(data.error||'Unable to send your request. Please try again.');setState('sent');setMessage('Thanks! Your demo request has been sent. We’ll contact you at the email you provided.');form.reset();}
    catch(error){setState('error');setMessage(error.name==='TimeoutError'?'The request timed out. Please try again or email us directly.':error.message||'Unable to send. Please try again.');}
    finally{submitting.current=false;}
  }
  return <form className="demoForm" onSubmit={submit}><h3>Book a demo</h3><p>A little context helps us make it useful for you.</p><div className="demoFormGrid"><label>Full name<input name="name" autoComplete="name" required maxLength={100} placeholder="Your name"/></label><label>Work email<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@company.com"/></label><label>Company<input name="company" autoComplete="organization" required maxLength={160} placeholder="Company name"/></label><label>Phone <small>(optional)</small><input name="phone" type="tel" autoComplete="tel" maxLength={30} placeholder="+91"/></label></div><label>Hiring volume<select name="volume" required defaultValue=""><option value="" disabled>Select your monthly hiring needs</option><option>1–5 hires / month</option><option>6–20 hires / month</option><option>21–50 hires / month</option><option>50+ hires / month</option><option>Just exploring</option></select></label><label>What would you like to explore?<textarea name="message" required minLength={10} maxLength={3000} rows={4} placeholder="Tell us about your roles, team or hiring challenges…"/></label><div className="demoTrap" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off"/></label></div><label className="demoConsent"><input name="consent" type="checkbox" required value="yes"/><span>I agree to be contacted about my demo request using these details.</span></label><button className="gradientBtn" type="submit" disabled={state==='sending'}>{state==='sending'?'Sending your request…':'Request my demo ↗'}</button><p className={'demoFormStatus '+state} role={state==='error'?'alert':'status'} aria-live="polite">{message}</p><small>Prefer email? <a href="mailto:aadilhussainkhan7@gmail.com">Contact us directly ↗</a></small></form>;
}
