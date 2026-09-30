'use client';
import { useState } from 'react';
export default function AccountDeletionCard({ email }) {
  const [requested, setRequested] = useState(false);
  return <section className="surfaceCard settingsCard accountDeletionCard"><small>DATA &amp; ACCOUNT</small><h2>Delete your account</h2>{requested ? <p role="status">Your account deletion request has been recorded for review. Fully deleting account data may take 7 to 14 days. Limited information may be retained where required by law, security or dispute handling.</p> : <><p>Request deletion of your Recruit AI account and associated workspace access. We will verify this request using <b>{email}</b> before processing it.</p><button type="button" onClick={() => setRequested(true)}>Request account deletion</button></>}</section>;
}
