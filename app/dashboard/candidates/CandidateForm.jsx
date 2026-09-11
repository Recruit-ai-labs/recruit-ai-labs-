'use client';

import Link from 'next/link';
import { useActionState, useEffect, useState } from 'react';
import { createCandidateAction, updateCandidateAction } from './actions';

const blank = { first_name: '', last_name: '', preferred_name: '', email: '', phone: '', location: '', current_title: '', current_company: '', linkedin_url: '', portfolio_url: '', total_experience: '', notice_period_days: '', source: '', skills: '', summary: '', consent_status: 'not-recorded', job_id: '', data_attested: false };
const steps = ['Identity', 'Professional profile', 'Resume & privacy'];
const fieldStep = { first_name: 0, email: 0, source: 0, linkedin_url: 1, portfolio_url: 1, total_experience: 1, notice_period_days: 1, resume: 2, consent_status: 2, data_attested: 2, job_id: 2 };

function ErrorText({ state, name }) { return state?.fieldErrors?.[name] ? <small className="fieldError">{state.fieldErrors[name]}</small> : null; }

export default function CandidateForm({ initialCandidate = null, jobs = [] }) {
  const editing = Boolean(initialCandidate?.id);
  const [resumeFile, setResumeFile] = useState(null);
  const [state, action, pending] = useActionState(async (previous, formData) => {
    if (resumeFile) formData.set('resume', resumeFile);
    return (editing ? updateCandidateAction : createCandidateAction)(previous, formData);
  }, { error: '', fieldErrors: {} });
  const [step, setStep] = useState(0);
  const [localError, setLocalError] = useState('');
  const [fileName, setFileName] = useState('');
  const [data, setData] = useState(() => ({ ...blank, ...(initialCandidate || {}), skills: (initialCandidate?.skills || []).join('\n'), data_attested: false }));
  const update = (name, value) => setData((current) => ({ ...current, [name]: value }));
  const fieldClass = (name) => state?.fieldErrors?.[name] ? 'hasError' : '';

  useEffect(() => {
    const firstError = Object.keys(state?.fieldErrors || {})[0];
    if (firstError && fieldStep[firstError] !== undefined) setStep(fieldStep[firstError]);
  }, [state]);

  function continueStep(event) {
    event.preventDefault();
    let valid = true;
    if (step === 0) valid = data.first_name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) && data.source;
    if (step === 1) valid = data.total_experience === '' || (Number(data.total_experience) >= 0 && Number(data.total_experience) <= 60);
    if (!valid) { setLocalError('Complete the required fields before continuing.'); return; }
    setLocalError(''); setStep((current) => Math.min(2, current + 1));
  }

  return (
    <form action={action} className="candidateFormShell" noValidate>
      {editing && <input type="hidden" name="candidateId" value={initialCandidate.id} />}
      {Object.entries(data).filter(([name]) => name !== 'data_attested').map(([name, value]) => <input key={name} type="hidden" name={name} value={value ?? ''} />)}
      <aside className="candidateFormAside"><p>CANDIDATE INTAKE</p><h2>{editing ? 'Update candidate' : 'Add a real candidate'}</h2><ol>{steps.map((label, index) => <li key={label} className={step === index ? 'active' : step > index ? 'done' : ''}><span>{step > index ? '✓' : index + 1}</span><b>{label}</b></li>)}</ol><div><b>Human data deserves care.</b><p>Store only information you are permitted to use for a legitimate hiring process.</p></div></aside>
      <div className="candidateFormMain"><div className="jobFormTop"><Link href={editing ? `/dashboard/candidates/${initialCandidate.id}` : '/dashboard/candidates'}>&larr; Cancel</Link><span>Step {step + 1} of 3</span></div><div className="jobProgress"><span style={{ width: `${((step + 1) / 3) * 100}%` }} /></div>
        {step === 0 && <section className="jobFormStage"><p className="pageEyebrow">IDENTITY</p><h1>Who is the candidate?</h1><p>Use contact information supplied for, or legitimately sourced for, this hiring process.</p><div className="jobFieldGrid"><label>First name <em>Required</em><input className={fieldClass('first_name')} value={data.first_name} onChange={(e) => update('first_name', e.target.value)} autoFocus /><ErrorText state={state} name="first_name" /></label><label>Last name <small>Optional</small><input value={data.last_name} onChange={(e) => update('last_name', e.target.value)} /></label><label>Preferred name <small>Optional</small><input value={data.preferred_name} onChange={(e) => update('preferred_name', e.target.value)} /></label><label>Email address <em>Required</em><input className={fieldClass('email')} type="email" value={data.email} onChange={(e) => update('email', e.target.value)} /><ErrorText state={state} name="email" /></label><label>Phone <small>Optional</small><input type="tel" value={data.phone} onChange={(e) => update('phone', e.target.value)} /></label><label>Location <small>Optional</small><input value={data.location} onChange={(e) => update('location', e.target.value)} placeholder="Pune, India" /></label><label>Candidate source <em>Required</em><select className={fieldClass('source')} value={data.source} onChange={(e) => update('source', e.target.value)}><option value="">Select source</option><option value="manual">Manual entry</option><option value="referral">Employee referral</option><option value="career-site">Career site</option><option value="import">Imported</option><option value="sourced">Outbound sourcing</option></select><ErrorText state={state} name="source" /></label></div></section>}
        {step === 1 && <section className="jobFormStage"><p className="pageEyebrow">PROFESSIONAL PROFILE</p><h1>Add current career context.</h1><p>This remains factual profile data. AI-derived evidence will be added only by the parsing feature.</p><div className="jobFieldGrid"><label>Current title <small>Optional</small><input value={data.current_title} onChange={(e) => update('current_title', e.target.value)} /></label><label>Current company <small>Optional</small><input value={data.current_company} onChange={(e) => update('current_company', e.target.value)} /></label><label>Total experience (years) <small>Optional</small><input className={fieldClass('total_experience')} type="number" min="0" max="60" step="0.5" value={data.total_experience} onChange={(e) => update('total_experience', e.target.value)} /><ErrorText state={state} name="total_experience" /></label><label>Notice period (days) <small>Optional</small><input className={fieldClass('notice_period_days')} type="number" min="0" max="365" value={data.notice_period_days} onChange={(e) => update('notice_period_days', e.target.value)} /><ErrorText state={state} name="notice_period_days" /></label><label>LinkedIn URL <small>Optional</small><input className={fieldClass('linkedin_url')} type="url" value={data.linkedin_url} onChange={(e) => update('linkedin_url', e.target.value)} placeholder="https://linkedin.com/in/..." /><ErrorText state={state} name="linkedin_url" /></label><label>Portfolio URL <small>Optional</small><input className={fieldClass('portfolio_url')} type="url" value={data.portfolio_url} onChange={(e) => update('portfolio_url', e.target.value)} /><ErrorText state={state} name="portfolio_url" /></label></div><label>Known skills <small>Optional, one per line</small><textarea rows="5" value={data.skills} onChange={(e) => update('skills', e.target.value)} placeholder={'JavaScript\nReact\nProduct analytics'} /></label><label>Recruiter summary <small>Optional</small><textarea rows="5" maxLength="3000" value={data.summary} onChange={(e) => update('summary', e.target.value)} placeholder="Add factual context and recruiter notes..." /><ErrorText state={state} name="summary" /></label></section>}
        <section hidden={step !== 2} className="jobFormStage"><p className="pageEyebrow">RESUME & PRIVACY</p><h1>Finish the candidate record.</h1><p>Resume upload is optional. Files are served only after Clerk and workspace authorization.</p><label className={`resumeDrop ${fieldClass('resume')}`}>Resume <small>PDF or DOCX, maximum 10 MB</small><input name="resume" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => { setResumeFile(e.target.files?.[0] || null); setFileName(e.target.files?.[0]?.name || ''); }} /><span>{fileName || (initialCandidate?.resume ? 'Replace the existing resume' : 'Choose a resume file')}</span><ErrorText state={state} name="resume" /></label><div className="jobFieldGrid"><label>Consent status <em>Required</em><select className={fieldClass('consent_status')} value={data.consent_status} onChange={(e) => update('consent_status', e.target.value)}><option value="not-recorded">Not recorded</option><option value="obtained">Consent obtained</option><option value="withdrawn">Consent withdrawn</option></select><ErrorText state={state} name="consent_status" /></label>{!editing && <label>Add to a job <small>Optional</small><select className={fieldClass('job_id')} value={data.job_id} onChange={(e) => update('job_id', e.target.value)}><option value="">Do not assign yet</option>{jobs.map((job) => <option value={job.id} key={job.id}>{job.title}</option>)}</select><ErrorText state={state} name="job_id" /></label>}</div><label className={`attestation ${fieldClass('data_attested')}`}><input name="data_attested" type="checkbox" value="yes" checked={data.data_attested} onChange={(e) => update('data_attested', e.target.checked)} /><span><b>I confirm that this candidate data may be stored and used for this hiring process.</b><small>This confirmation is required for both new records and profile updates.</small></span></label><ErrorText state={state} name="data_attested" />{state?.duplicateId && <Link className="duplicateLink" href={`/dashboard/candidates/${state.duplicateId}`}>Open the existing candidate &rarr;</Link>}</section>
        {(localError || state?.error) && <p className="formError" role="alert">{localError || state.error}</p>}
        <footer className="jobFormActions"><span /><div>{step > 0 && <button className="secondaryAction" type="button" onClick={() => { setLocalError(''); setStep((value) => value - 1); }}>&larr; Back</button>}{step < 2 ? <button className="primaryAction" type="button" onClick={continueStep}>Continue <span>&rarr;</span></button> : <button className="primaryAction" type="submit" disabled={pending}>{pending ? 'Saving candidate...' : editing ? 'Save candidate' : 'Add candidate'} <span>&rarr;</span></button>}</div></footer>
      </div>
    </form>
  );
}

