'use client';
import {useActionState, useState} from 'react';
import {deleteVettingAction} from './actions';
import Icon from '../components/Icon';
export default function DeleteCheck({id, name}) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState(deleteVettingAction, {});
  return <div className="vettingDelete">{confirming ? <form action={action}><input type="hidden" name="id" value={id}/><p>Delete this check for {name}? This cannot be undone.</p><div className="reviewActions"><button className="dangerAction" disabled={pending}>{pending ? 'Deleting…' : 'Delete check'}</button><button type="button" disabled={pending} onClick={() => setConfirming(false)}>Keep check</button></div>{state.error && <p role="alert">{state.error}</p>}</form> : <button type="button" aria-label={`Delete check for ${name}`} onClick={() => setConfirming(true)}><Icon name="trash" size={16}/>Delete</button>}</div>;
}
