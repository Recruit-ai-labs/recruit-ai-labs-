'use client';
import { useClerk } from '@clerk/nextjs';
import { useState } from 'react';
export default function AccessSignOut() {
  const clerk = useClerk(), [busy, setBusy] = useState(false), [error, setError] = useState('');
  return <div><button className="darkButton" disabled={busy} onClick={async () => {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/access/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (!response.ok) throw new Error();
      if (clerk.session) await clerk.signOut();
      window.location.replace('/sign-in');
    } catch { setError('Could not sign out. Retry.'); setBusy(false); }
  }}>{busy ? 'Signing out...' : 'Sign out ↗'}</button>{error && <small role="alert">{error}</small>}</div>;
}
