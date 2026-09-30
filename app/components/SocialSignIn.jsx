'use client';

import { useState } from 'react';
import { useSignIn } from '@clerk/nextjs/legacy';

const providers = [
  { strategy: 'oauth_google', label: 'Google', icon: <svg viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.5-.2-2.2H12v3.9h5.4a4.7 4.7 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.3 2.9-7.3Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.5l-3.3-2.6c-.9.6-2 1-3.4 1a5.9 5.9 0 0 1-5.5-4.1H3.1v2.7A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.5 13.8A6 6 0 0 1 6.2 12c0-.6.1-1.2.3-1.8V7.5H3.1A10 10 0 0 0 2 12c0 1.6.4 3.1 1.1 4.5l3.4-2.7Z"/><path fill="#EA4335" d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 12 2a10 10 0 0 0-8.9 5.5l3.4 2.7A5.9 5.9 0 0 1 12 6.1Z"/></svg> },
  { strategy: 'oauth_facebook', label: 'Facebook', icon: <svg viewBox="0 0 24 24"><path fill="#1877F2" d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.3.2 2.3.2v2.5h-1.3c-1.3 0-1.7.8-1.7 1.6V12h2.9l-.5 2.9h-2.4v7A10 10 0 0 0 22 12Z"/><path fill="#fff" d="m15.9 14.9.5-2.9h-2.9v-1.8c0-.8.4-1.6 1.7-1.6h1.3V6.1s-1.2-.2-2.3-.2c-2.3 0-3.8 1.4-3.8 3.9V12H7.9v2.9h2.5v7a10.5 10.5 0 0 0 3.1 0v-7h2.4Z"/></svg> },
  { strategy: 'oauth_apple', label: 'Apple', icon: <svg className="appleLogo" viewBox="0 0 24 24"><path fill="#000" d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.33-.07 2.26.73 3.05.78 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.5 4.1ZM12.03 7.25C11.88 5.02 13.69 3.18 15.77 3c.29 2.58-2.34 4.5-3.74 4.25Z"/></svg> },
];

export default function SocialSignIn() {
  const { signIn, isLoaded } = useSignIn();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  async function continueWith(provider) {
    if (!isLoaded || !signIn || busy) return;
    setBusy(provider.strategy);
    setError('');
    try {
      // Remove any email-code session before Clerk establishes a social identity.
      const logout = await fetch('/api/access/logout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
      });
      if (!logout.ok) throw new Error('Could not start social sign-in. Please retry.');
      await signIn.authenticateWithRedirect({
        strategy: provider.strategy,
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/auth/continue',
      });
    } catch (err) {
      setError(err?.errors?.[0]?.longMessage || `Could not continue with ${provider.label}. Please retry.`);
      setBusy('');
    }
  }

  return <div className="authProviderPreview" aria-label="Social sign-in providers">
    <div>{providers.map((provider) => <button key={provider.strategy} type="button" disabled={!isLoaded || Boolean(busy)} onClick={() => continueWith(provider)} aria-label={`Continue with ${provider.label}`}>
      <span className="providerIcon" aria-hidden="true">{provider.icon}</span>
      <b>{busy === provider.strategy ? 'Connecting...' : provider.label}</b>
    </button>)}</div>
    {error && <p className="accessError" role="alert">{error}</p>}
  </div>;
}
