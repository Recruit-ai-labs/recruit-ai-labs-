'use client';
import {useActionState, useState} from 'react';
import {createInterviewAction} from '../actions';
export default function InterviewForm({applications}) {
  const [details,setDetails]=useState({title:'',interview_type:'',starts_at:'',ends_at:'',meeting_url:'',interviewers:''});
  const field=name=>({value:details[name],onChange:event=>setDetails(current=>({...current,[name]:event.target.value}))});
  const [state,action,pending]=useActionState(async (previous,fd)=>{
    for(const key of ['starts_at','ends_at']) { const date=new Date(String(fd.get(key)||'')); if(!Number.isFinite(date.getTime()))return {error:'Enter valid start and end times.'}; fd.set(key,date.toISOString()); }
    fd.set('timezone',Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
    return createInterviewAction(previous,fd);
  },{});
  const [job,setJob]=useState(''),[application,setApplication]=useState('');
  const jobs=[...new Map(applications.map(a=>[a.job,{id:a.job,title:a.jobTitle}])).values()];
  const selected=applications.find(a=>a.id===application && a.job===job);
  return <form action={action}><label>Interview title<input name="title" {...field('title')} required maxLength={160}/></label><label>Interview type<select name="interview_type" {...field('interview_type')} required><option value="">Select type</option>{['screening','technical','behavioral','case-study','final','other'].map(x=><option key={x}>{x}</option>)}</select></label><label>Job<select name="jobId" required value={job} onChange={e=>{setJob(e.target.value);setApplication('')}}><option value="">Select job</option>{jobs.map(j=><option key={j.id} value={j.id}>{j.title}</option>)}</select></label><label>Candidate application<select name="applicationId" required disabled={!job} value={application} onChange={e=>setApplication(e.target.value)}><option value="">{job ? 'Select candidate' : 'Select a job first'}</option>{applications.filter(a=>a.job===job).map(a=><option key={a.id} value={a.id}>{a.candidateName} — {a.candidateEmail} — {a.stage}</option>)}</select></label><input type="hidden" name="candidateId" value={selected?.candidate || ''}/><div className="interviewDateGrid"><label>Starts<input name="starts_at" {...field('starts_at')} type="datetime-local" required/></label><label>Ends<input name="ends_at" {...field('ends_at')} type="datetime-local" required/></label></div><p>Enter times in your device’s timezone.</p><label>Meeting URL (optional)<input name="meeting_url" {...field('meeting_url')} type="url"/></label><label>Interviewers (comma-separated emails)<input name="interviewers" {...field('interviewers')}/></label>{state.error && <p role="alert" className="formError">{state.error}</p>}<button className="primaryAction" disabled={pending || !selected}>{pending ? 'Scheduling…' : 'Schedule interview'}</button></form>;
}
