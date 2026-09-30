'use client';
import { useActionState } from 'react';
import { createSireenLink } from './actions';
export default function InterviewSetup({ jobId, open }) {
  const [state, action, pending] = useActionState(createSireenLink, {});
  return <form action={action} className="dnaSetup"><input type="hidden" name="jobId" value={jobId}/><button className="dnaButton" disabled={!open || pending}>{pending ? 'Understanding the role…' : 'Generate interview link'}</button><p aria-live="polite">{state.error || state.success || (!open ? 'Publish this job to create an interview.' : 'Valid for 14 days · Up to 100 applicants · Five adaptive questions')}</p></form>;
}
