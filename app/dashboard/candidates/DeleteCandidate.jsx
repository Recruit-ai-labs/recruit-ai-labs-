'use client';

import { useActionState, useRef } from 'react';
import { deleteCandidateAction } from './actions';

export default function DeleteCandidate({ candidateId, candidateName }) {
  const dialog = useRef(null);
  const cancel = useRef(null);
  const [state, action, pending] = useActionState(deleteCandidateAction, {});
  return <>
    <button className="candidateDeleteTrigger" type="button" onClick={() => { dialog.current.showModal(); cancel.current.focus(); }}>Delete candidate</button>
    <dialog ref={dialog} className="candidateDeleteDialog" aria-labelledby="delete-candidate-title" aria-describedby="delete-candidate-description" onCancel={event => { if (pending) event.preventDefault(); }}>
      <form action={action}>
        <h2 id="delete-candidate-title">Delete candidate permanently?</h2>
        <p id="delete-candidate-description"><strong>{candidateName}</strong> will be removed along with their resume, applications, interviews, scorecards and linked evaluations. This cannot be undone.</p>
        <input type="hidden" name="candidateId" value={candidateId}/>
        <label className="candidateDeleteConfirm"><input type="checkbox" name="confirmed" value="yes" required disabled={pending}/>I understand this permanently deletes this candidate and their linked records.</label>
        {state.error && <p role="alert" className="candidateDeleteError">{state.error}</p>}
        <div className="candidateDeleteActions"><button ref={cancel} type="button" disabled={pending} onClick={() => { dialog.current.close(); dialog.current.querySelector('form').reset(); }}>Cancel</button><button className="candidateDeleteSubmit" type="submit" disabled={pending}>{pending ? 'Deleting…' : 'Delete permanently'}</button></div>
      </form>
    </dialog>
  </>;
}
