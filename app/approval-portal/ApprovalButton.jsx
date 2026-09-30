'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
export default function ApprovalButton({ number, retry = false }) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), lock = useRef(false), router = useRouter();
  return <div><button className="approvalButton" disabled={busy} onClick={async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/approvals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ number }), signal: AbortSignal.timeout(25000) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMessage(data.notified ? 'Approved. Approval email sent.' : 'Approved, but email delivery failed. Retry the notification.'); router.refresh();
    } catch (error) { setMessage(error.message || 'Unable to approve. Please retry.'); }
    finally { lock.current = false; setBusy(false); }
  }}>{busy ? 'Please wait...' : retry ? 'Retry approval email ↗' : 'Approve access ↗'}</button>{message && <p role="status" className="approvalFeedback">{message}</p>}</div>;
}
