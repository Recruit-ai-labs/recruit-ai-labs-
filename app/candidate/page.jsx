import Link from 'next/link';
import {redirect} from 'next/navigation';
import {candidateIdentity} from '../../lib/candidate-session';
import {listRecords, getRecord, pbFilterValue} from '../../lib/pocketbase';
import './portal.css';

export const dynamic = 'force-dynamic';
const label = value => String(value || '').replaceAll('-', ' ');

export default async function CandidatePortal() {
  const identity = await candidateIdentity();
  if (!identity) redirect('/sign-in?redirect_url=/candidate');
  const emailFilter = identity.emails.map(email => `email = "${pbFilterValue(email)}"`).join(' || ');
  const candidates = await listRecords('candidates', {filter: `(${emailFilter}) && status = "active"`, perPage: 100});
  const applications = (await Promise.all(candidates.items.map(candidate => listRecords('applications', {filter: `candidate = "${pbFilterValue(candidate.id)}"`, sort: '-updated', perPage: 100})))).flatMap(result => result.items);
  const jobs = new Map((await Promise.all([...new Set(applications.map(application => application.job))].map(id => getRecord('jobs', id).catch(() => null)))).filter(Boolean).map(job => [job.id, job]));
  return <main className="candidatePortal"><header><div><small>RECRUIT AI TALENT</small><h1>Your opportunities</h1><p>Track your applications and the information you have shared.</p></div><Link href="/">Recruit AI home</Link></header><section className="candidatePortalGrid">{applications.length ? applications.map(application => {const job = jobs.get(application.job); return <article key={application.id}><small>{job?.department || 'Opportunity'}</small><h2>{job?.title || 'Role'}</h2><div className="candidateStage"><span>{label(application.stage)}</span><i/></div><p>Status: <b>{label(application.status)}</b></p><details><summary>Your data</summary><p>Application created {application.applied_at?.slice(0, 10) || 'recently'}. Recruiter-only notes and internal recommendations are never shown here.</p></details></article>;}) : <article><h2>No active applications</h2><p>Contact the hiring team to begin an application.</p></article>}</section></main>;
}
