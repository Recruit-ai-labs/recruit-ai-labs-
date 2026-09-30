'use client';
import {useActionState, useState} from 'react';
import {saveDeskEvent} from './actions';
export default function TaskTools({recordKey, canManage, draft, history = [], summaryLabel = 'Notes, ownership & reminders'}) {
  const [state, action, pending] = useActionState(saveDeskEvent, {});
  const [copy, setCopy] = useState(draft || '');
  const [copyStatus, setCopyStatus] = useState('');
  const [note, setNote] = useState('');
  return <details className="deskTools"><summary>{summaryLabel}</summary>
    {draft && <><label>Editable follow-up draft<textarea value={copy} rows={6} onChange={event => setCopy(event.target.value)}/></label><button type="button" onClick={async () => {try {await navigator.clipboard.writeText(copy);setCopyStatus('Draft copied. Review before sending.');} catch {setCopyStatus('Copy unavailable. Select and copy the draft manually.');}}}>Copy draft</button><p role="status">{copyStatus}</p><small>Copying does not send a message or mark a task complete.</small></>}
    {canManage && <form action={action}><input type="hidden" name="key" value={recordKey}/><label>Action<select name="kind"><option value="note">Add review note</option><option value="assign">Assign to me</option><option value="snooze">Set reminder date</option><option value="done">Mark task handled</option><option value="reopen">Reopen task</option><option value="work-sample">Record practical exercise evidence</option></select></label><label>Note / exercise and observed result<textarea name="note" value={note} onChange={event => setNote(event.target.value)} maxLength={4000} rows={3} placeholder="Record the task, candidate's work, observed outcome and remaining questions."/></label><label>Reminder date (for reminders only)<input type="date" name="due"/></label><button disabled={pending}>{pending ? 'Saving…' : 'Save'}</button><p role="status">{state.error || state.success}</p><small>These actions track work; candidate hiring stages remain controlled by the existing review screen.</small></form>}
    <ol>{[...history].sort((a,b)=>String(b.metadata?.at || b.created || '').localeCompare(String(a.metadata?.at || a.created || ''))).slice(0, 10).map(event => <li key={event.id}><b>{event.metadata?.kind}</b> · {event.metadata?.at || event.created}<p>{event.metadata?.note}</p>{event.metadata?.due && <p>Reminder: {event.metadata.due}</p>}{event.metadata?.owner && <small>Owner: {event.metadata.owner}</small>}</li>)}</ol>
  </details>;
}
