'use client';

import {useAuth,useClerk,useUser} from '@clerk/nextjs';
import {useEffect,useState} from 'react';
import EmailAccessForm from './EmailAccessForm';
import SocialSignIn from './SocialSignIn';

export default function SignInPanel() {
  const {isLoaded,isSignedIn}=useAuth(),{user}=useUser(),clerk=useClerk();
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[sessionTimedOut,setSessionTimedOut]=useState(false);
  useEffect(()=>{if(isLoaded){setSessionTimedOut(false);return;}const timer=setTimeout(()=>setSessionTimedOut(true),10000);return()=>clearTimeout(timer);},[isLoaded]);
  async function switchAccount(){if(busy)return;setBusy(true);setError('');try{const response=await fetch('/api/access/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(!response.ok)throw new Error();await clerk.signOut();window.location.replace('/sign-in');}catch{setError('Could not clear the current session. Please retry.');setBusy(false);}}
  if(!isLoaded&&sessionTimedOut)return <section className="authSessionFallback" role="alert"><p>Session checking is taking longer than expected. Privacy settings or blocked cookies may be preventing sign-in.</p><button className="gradientBtn" type="button" onClick={()=>window.location.reload()}>Retry sign-in</button><a href="mailto:hello@recruitailabs.in">Contact support</a></section>;
  if(!isLoaded)return <p className="authSessionLoading" role="status">Checking your session…</p>;
  if(isSignedIn){const email=user?.primaryEmailAddress?.emailAddress||'';return <section className="authExistingSession" aria-label="Current signed-in session"><p>You are already signed in{email?<> as <strong>{email}</strong></>:''}.</p><button className="gradientBtn" type="button" onClick={()=>window.location.assign('/auth/continue')}>Continue to your account →</button><button className="authSwitchAccount" type="button" disabled={busy} onClick={switchAccount}>{busy?'Clearing session…':'Use another account'}</button>{error&&<p className="accessError" role="alert">{error}</p>}</section>;}
  return <><SocialSignIn/><div className="authForm"><EmailAccessForm/></div></>;
}
