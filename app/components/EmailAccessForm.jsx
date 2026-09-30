'use client';
import { useRef, useState } from 'react';
import { useSignIn } from '@clerk/nextjs/legacy';

export default function EmailAccessForm() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = useState(''), [code, setCode] = useState(''), [challenge, setChallenge] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [sentAt, setSentAt] = useState(0);
  const lock = useRef(false);
  async function run(verify) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const response = await fetch(`/api/access/${verify ? 'verify' : 'request'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(verify ? { challengeId: challenge, code } : { email }), signal: AbortSignal.timeout(25000) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (!verify) { setChallenge(result.challengeId); setSentAt(Date.now()); setCode(''); return; }
      if (result.ticket) {
        if (!signIn || !setActive) throw new Error('Sign-in is loading. Please request a new code and retry.');
        const attempt = await signIn.create({ strategy: 'ticket', ticket: result.ticket });
        if (attempt.status !== 'complete') throw new Error('Your account needs an additional verification step. Please contact support.');
        await setActive({ session: attempt.createdSessionId });
      }
      window.location.assign(result.redirect);
    } catch (err) { setError(err?.errors?.[0]?.longMessage || err.message || 'Unable to continue. Please retry.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <form className="emailAccessForm" onSubmit={(event) => { event.preventDefault(); run(Boolean(challenge)); }}>
    {challenge ? <><p className="otpSent" role="status">We sent a six-digit code to <strong>{email}</strong>.</p><label htmlFor="access-code">Verification code</label><input id="access-code" name="code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoFocus /><p className="otpHint">Your code expires in 10 minutes.</p></> : <><label htmlFor="access-email">Email address</label><input id="access-email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} required placeholder="you@company.com" /><p className="otpHint">Verify your email to check your access or join the waiting list.</p></>}
    <button type="submit" className="gradientBtn" disabled={busy || !isLoaded}>{busy ? 'Please wait...' : challenge ? 'Verify & continue →' : 'Continue with email →'}</button>
    {challenge && <div className="otpActions"><button type="button" disabled={busy} onClick={() => { setChallenge(''); setCode(''); setError(''); }}>Change email</button><button type="button" disabled={busy} onClick={() => { if (Date.now() - sentAt < 60000) setError('Please wait one minute before requesting another code.'); else run(false); }}>Resend code</button></div>}
    {error && <p className="accessError" role="alert">{error}</p>}
  </form>;
}
