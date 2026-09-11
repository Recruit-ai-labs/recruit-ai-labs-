'use client';

import { useActionState, useState } from 'react';
import { completeOnboarding } from './actions';

const initialState = { error: '', fieldErrors: {} };
const goals = [
  ['build-team', 'Build a team', 'Plan and fill multiple roles'],
  ['hire-faster', 'Hire faster', 'Reduce time from brief to shortlist'],
  ['improve-quality', 'Improve quality', 'Make evidence-led decisions'],
  ['organize-pipeline', 'Organize hiring', 'Bring scattered work into one place'],
  ['agency-delivery', 'Deliver for clients', 'Manage recruiting assignments'],
];

export default function OnboardingForm({ defaultName = '' }) {
  const [state, action, pending] = useActionState(completeOnboarding, initialState);
  const [step, setStep] = useState(0);
  const [localError, setLocalError] = useState('');
  const [data, setData] = useState({ companyName: '', website: '', companySize: '', hiringGoal: '', name: defaultName, jobFunction: '' });
  const update = (key, next) => setData((current) => ({ ...current, [key]: next }));

  function nextStep() {
    const valid = step === 0 ? data.companyName.trim().length >= 2 && data.companySize && (!data.website || /^https?:\/\//i.test(data.website)) : data.name.trim().length >= 2 && data.jobFunction && data.hiringGoal;
    if (!valid) {
      setLocalError(step === 0 ? 'Add a valid company name, size and complete website URL.' : 'Tell us your name, role and primary hiring goal.');
      return;
    }
    setLocalError('');
    setStep((current) => Math.min(2, current + 1));
  }

  return (
    <div className="onboardingPanel">
      <aside className="onboardingAside"><p>WORKSPACE SETUP</p><h1>Let us build your hiring home.</h1><span>Two minutes now gives every job, candidate and decision the right context later.</span><ol>{['Company', 'Your role', 'Review'].map((label, index) => <li key={label} className={step === index ? 'active' : step > index ? 'done' : ''}><b>{step > index ? '✓' : index + 1}</b><span>{label}<small>{index === 0 ? 'Workspace identity' : index === 1 ? 'Hiring context' : 'Confirm details'}</small></span></li>)}</ol></aside>
      <form action={action} className="onboardingForm">
        {Object.entries(data).map(([key, fieldValue]) => <input key={key} type="hidden" name={key} value={fieldValue} />)}
        <div className="onboardingProgress"><span style={{ width: `${((step + 1) / 3) * 100}%` }} /></div>
        <p className="formStep">STEP {step + 1} OF 3</p>
        {step === 0 && <div className="formStage"><h2>Start with your company.</h2><p>This becomes the private workspace your hiring team shares.</p><label>Company or workspace name <em>Required</em><input value={data.companyName} onChange={(event) => update('companyName', event.target.value)} placeholder="Acme Technologies" autoFocus /></label><div className="formRow"><label>Company website <small>Optional</small><input type="url" value={data.website} onChange={(event) => update('website', event.target.value)} placeholder="https://company.com" /></label><label>Company size <em>Required</em><select value={data.companySize} onChange={(event) => update('companySize', event.target.value)}><option value="">Select size</option>{['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'].map((size) => <option key={size}>{size}</option>)}</select></label></div></div>}
        {step === 1 && <div className="formStage"><h2>Make the workspace yours.</h2><p>We use this to shape your default workflow. You can change it later.</p><div className="formRow"><label>Your full name <em>Required</em><input value={data.name} onChange={(event) => update('name', event.target.value)} placeholder="Your name" autoFocus /></label><label>Your role <em>Required</em><select value={data.jobFunction} onChange={(event) => update('jobFunction', event.target.value)}><option value="">Select role</option><option value="founder-owner">Founder / Owner</option><option value="talent-leader">Talent leader</option><option value="recruiter">Recruiter</option><option value="hiring-manager">Hiring manager</option><option value="interviewer">Interviewer</option><option value="operations">People operations</option></select></label></div><fieldset><legend>What matters most right now?</legend><div className="goalGrid">{goals.map(([id, title, note]) => <button type="button" key={id} className={data.hiringGoal === id ? 'selected' : ''} onClick={() => update('hiringGoal', id)}><b>{title}</b><span>{note}</span></button>)}</div></fieldset></div>}
        {step === 2 && <div className="formStage reviewStage"><h2>Everything look right?</h2><p>Recruit AI will create these records in your PocketBase workspace.</p><dl><div><dt>Workspace</dt><dd>{data.companyName}</dd></div><div><dt>Website</dt><dd>{data.website || 'Not provided'}</dd></div><div><dt>Company size</dt><dd>{data.companySize} people</dd></div><div><dt>Your name</dt><dd>{data.name}</dd></div><div><dt>Your role</dt><dd>{data.jobFunction.replace('-', ' ')}</dd></div><div><dt>Hiring goal</dt><dd>{goals.find(([id]) => id === data.hiringGoal)?.[1]}</dd></div></dl><div className="securityNote"><b>Private by default</b><span>Only authenticated workspace members can access product data through the server authorization layer.</span></div></div>}
        {(localError || state?.error) && <p className="formError" role="alert">{localError || state.error}</p>}
        <div className="formActions">{step > 0 ? <button type="button" className="secondaryAction" onClick={() => { setLocalError(''); setStep((current) => current - 1); }} disabled={pending}>&larr; Back</button> : <span />}{step < 2 ? <button type="button" className="primaryAction" onClick={nextStep}>Continue <span>&rarr;</span></button> : <button type="submit" className="primaryAction" disabled={pending}>{pending ? 'Creating workspace...' : 'Create workspace'} <span>&rarr;</span></button>}</div>
      </form>
    </div>
  );
}
