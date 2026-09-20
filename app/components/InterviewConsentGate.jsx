'use client';

import {useState} from 'react';
import Link from 'next/link';
import {interviewConsentCopy} from '../../config/interview-consent';

export default function InterviewConsentGate({children, enabled = false, onConsent}) {
  const [isAdult, setIsAdult] = useState(false);
  const [hasConsented, setHasConsented] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [pending, setPending] = useState(false);

  if (!enabled || accepted) return children;

  const submit = async (event) => {
    event.preventDefault();
    if (!isAdult || !hasConsented || pending) return;
    setPending(true);
    try {
      await onConsent?.({
        policyVersion: interviewConsentCopy.policyVersion,
        textVersion: interviewConsentCopy.textVersion,
      });
      setAccepted(true);
    } finally {
      setPending(false);
    }
  };

  return <main className="voiceExperience">
    <section className="voicePanel" aria-labelledby="interview-consent-title">
      <p><strong>{interviewConsentCopy.legalReviewNotice}</strong></p>
      <h1 id="interview-consent-title">{interviewConsentCopy.title}</h1>
      <p>{interviewConsentCopy.introduction}</p>
      <ul>{interviewConsentCopy.disclosures.map(item => <li key={item}>{item}</li>)}</ul>
      <p><Link href="/grievance">Data Rights &amp; Erasure</Link></p>
      <form onSubmit={submit}>
        <label><input type="checkbox" checked={isAdult} onChange={event => setIsAdult(event.target.checked)} /> {interviewConsentCopy.ageConfirmation}</label>
        <label><input type="checkbox" checked={hasConsented} onChange={event => setHasConsented(event.target.checked)} /> {interviewConsentCopy.consentConfirmation}</label>
        <button type="submit" disabled={!isAdult || !hasConsented || pending}>{pending ? 'DRAFT - NEEDS LEGAL REVIEW — Recording consent…' : interviewConsentCopy.continueLabel}</button>
      </form>
    </section>
  </main>;
}
