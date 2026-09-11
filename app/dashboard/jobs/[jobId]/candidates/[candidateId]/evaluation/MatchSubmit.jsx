'use client';
import { useFormStatus } from 'react-dom';
export default function MatchSubmit({ idle, pending, className = 'primaryAction' }) { const state = useFormStatus(); return <button className={className} disabled={state.pending} type="submit">{state.pending ? pending : idle} <span>&rarr;</span></button>; }
