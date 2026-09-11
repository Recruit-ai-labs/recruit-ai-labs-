'use client';
import {useActionState} from 'react';
import {acceptInviteAction} from './actions';
export default function JoinForm({token}) {const[state,action,pending]=useActionState(acceptInviteAction,{});return <form action={action}><input type="hidden" name="token" value={token}/><p>Sign in with the verified email address invited by the workspace admin.</p>{state.error&&<p role="alert">{state.error}</p>}<button className="primaryAction" disabled={pending}>{pending?'Joining…':'Accept invitation'}</button></form>;}
