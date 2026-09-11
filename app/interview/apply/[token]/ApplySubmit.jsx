'use client';
import {useFormStatus} from 'react-dom';
export default function ApplySubmit(){const {pending}=useFormStatus();return <button className="welcomeContinue" disabled={pending} type="submit"><span>{pending?'Preparing your interview…':'Continue to device check'}</span><span aria-hidden="true">→</span></button>}
