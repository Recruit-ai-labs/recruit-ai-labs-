'use client';
import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { sendCandidateEmailAction } from './actions';
function SendButton({blocked}) { const {pending}=useFormStatus(); return <button className="primaryAction" disabled={blocked || pending}>{blocked ? 'Sending blocked' : pending ? 'Sending…' : 'Send email'}</button>; }
export default function EmailForm({candidate,templates,blocked}) {
  const fill = text => text.replaceAll('{{first_name}}', candidate.preferred_name || candidate.first_name).replaceAll('{{role}}','this role');
  const [template,setTemplate]=useState('interview-invite');
  const [subject,setSubject]=useState(templates['interview-invite'][0]);
  const [body,setBody]=useState(fill(templates['interview-invite'][1]));
  function select(event) { const key=event.target.value; setTemplate(key); setSubject(templates[key][0]); setBody(fill(templates[key][1])); }
  return <form action={sendCandidateEmailAction}><input type="hidden" name="candidateId" value={candidate.id}/><label>Template<select name="template" value={template} onChange={select}>{Object.keys(templates).map(key=><option key={key} value={key}>{key.replaceAll('-',' ')}</option>)}</select></label><p>Changing the template replaces the subject and message. Review them before sending.</p><label>To<input value={candidate.email} readOnly/></label><label>Subject<input name="subject" required maxLength={200} value={subject} onChange={e=>setSubject(e.target.value)}/></label><label>Message<textarea name="body" required rows={10} maxLength={10000} value={body} onChange={e=>setBody(e.target.value)}/></label><SendButton blocked={blocked}/></form>;
}
