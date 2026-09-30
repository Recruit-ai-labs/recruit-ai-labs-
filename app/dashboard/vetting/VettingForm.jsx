'use client';
import {useActionState} from 'react';
import {recordVettingAction} from './actions';

export default function VettingForm({candidates}) {
  const [state,action,pending]=useActionState(recordVettingAction,{});
  return <form action={action}>
    <label>Candidate<select name="candidate" required><option value="">Select</option>{candidates.map(c=><option value={c.id} key={c.id}>{c.first_name} {c.last_name}</option>)}</select></label>
    <label>Check<select name="kind">{['identity','education','employment','reference','work-sample','technical'].map(x=><option key={x}>{x}</option>)}</select></label>
    <label>Status<select name="status">{['requested','candidate-provided','reviewed','verified','rejected'].map(x=><option key={x}>{x}</option>)}</select></label>
    <label>Risk level<select name="risk_level" defaultValue="none"><option value="none">No risk flagged</option><option value="low">Low risk</option><option value="medium">Medium risk</option><option value="high">High risk</option></select></label>
    <label>Due date <span className="formOptional">(optional)</span><input name="due_at" type="date"/></label>
    <label>Evidence source URL <span className="formOptional">(optional)</span><input name="source_url" type="url" inputMode="url" placeholder="https://…" maxLength={2048}/></label>
    <label>Evidence file <span className="formOptional">(optional · PDF, PNG or JPG · max 10 MB)</span><input name="evidence_file" type="file" accept="application/pdf,image/png,image/jpeg"/></label>
    <label>Evidence / reviewer note<textarea name="evidence" required minLength={10} maxLength={3000}/></label>
    <label className="attestation"><input name="vetting_consent_confirmed" type="checkbox" value="yes" required/><span><b>I confirm that I am authorized to collect and review this vetting evidence.</b><small>This records a consent checkpoint for this check; it does not replace the candidate profile’s consent status.</small></span></label>
    <button disabled={pending}>{pending?'Saving…':'Record check'}</button><p role={state.error?'alert':'status'}>{state.error||state.message}</p>
  </form>;
}
