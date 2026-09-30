'use client';
import { useActionState } from 'react';
import { retryTechDNA } from './tech-dna-actions';
export default function RetryTechDNA({ sessionId, candidateId }) {
  const [state, action, pending] = useActionState(retryTechDNA, {});
  return <form action={action}><input type="hidden" name="sessionId" value={sessionId}/><input type="hidden" name="candidateId" value={candidateId}/><button className="dnaButton" disabled={pending}>{pending?'Analyzing saved answers…':'Generate / retry Tech DNA'}</button><p role="status">{state?.error || state?.success}</p></form>;
}
