import Link from 'next/link';
import InterviewHistory from './InterviewHistory';
import DeleteCandidate from '../DeleteCandidate';
import { notFound } from 'next/navigation';
import { canManageCandidates, getCandidateForWorkspace, getJobForWorkspace, listCandidateActivities, listCandidateApplications } from '../../../../lib/recruit-data';
import { requireWorkspace } from '../../../../lib/workspace-page';
import { changeCandidateStatusAction } from '../actions';

const displayDate = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not recorded';

export default async function CandidatePage({ params }) {
  const { candidateId } = await params;
  const { workspace, membership } = await requireWorkspace();
  const candidate = await getCandidateForWorkspace(workspace.id, candidateId);
  if (!candidate) notFound();
  const [applications, activities] = await Promise.all([listCandidateApplications(workspace.id, candidate.id), listCandidateActivities(workspace.id, candidate.id)]);
  const jobPairs = await Promise.all((applications.items || []).map(async (application) => [application, await getJobForWorkspace(workspace.id, application.job)]));
  const canManage = canManageCandidates(membership);
  const nextStatuses = candidate.status === 'active' ? ['do-not-contact', 'archived'] : candidate.status === 'do-not-contact' ? ['active', 'archived'] : ['active'];
  const fullName = [candidate.first_name, candidate.last_name].filter(Boolean).join(' ');
  return <div className="productPage candidateProfile">
    <Link className="backLink" href="/dashboard/candidates">&larr; All candidates</Link>
    <header className="candidateProfileHeader">
      <div className="candidateHeroAvatar">{`${candidate.first_name?.[0] || ''}${candidate.last_name?.[0] || ''}`.toUpperCase()}</div>
      <div><div className="candidateNameLine"><h1>{candidate.preferred_name || fullName}</h1><mark className={`candidateStatus ${candidate.status}`}>{candidate.status}</mark></div>{candidate.preferred_name && <small>Legal name: {fullName}</small>}<p>{candidate.current_title || 'Current role not provided'}{candidate.current_company ? ` at ${candidate.current_company}` : ''}</p></div>
      {canManage && <div className="candidateHeaderActions">{candidate.status !== 'archived' && <Link href={`/dashboard/candidates/${candidate.id}/edit`}>Edit profile</Link>}<Link href={`/dashboard/candidates/${candidate.id}/communication`}>Email candidate</Link>{nextStatuses.map((status) => <form action={changeCandidateStatusAction} key={status}><input type="hidden" name="candidateId" value={candidate.id} /><input type="hidden" name="status" value={status} /><button type="submit" disabled={status === 'active' && candidate.consent_status === 'withdrawn'}>{status === 'active' ? 'Restore active' : status}</button></form>)}</div>}
    </header>
    {canManage && <div className="candidateDeleteRow"><DeleteCandidate candidateId={candidate.id} candidateName={candidate.preferred_name || fullName}/></div>}
    <nav className="jobTabs"><a className="active" href="#profile">Profile</a><a href="#applications">Applications <span>{applications.totalItems || 0}</span></a><a href="#activity">Activity</a></nav>
    <div className="candidateProfileGrid" id="profile"><main>
      <section className="surfaceCard candidateSection"><small>PROFESSIONAL PROFILE</small><div className="candidateFactGrid"><div><span>Current title</span><b>{candidate.current_title || 'Not provided'}</b></div><div><span>Company</span><b>{candidate.current_company || 'Not provided'}</b></div><div><span>Total experience</span><b>{candidate.total_experience !== null && candidate.total_experience !== '' ? `${candidate.total_experience} years` : 'Not provided'}</b></div><div><span>Notice period</span><b>{candidate.notice_period_days !== null && candidate.notice_period_days !== '' ? `${candidate.notice_period_days} days` : 'Not provided'}</b></div></div><h2>Known skills</h2><div className="skillTags">{candidate.skills?.length ? candidate.skills.map((skill) => <span key={skill}>{skill}</span>) : <p>No manually recorded skills.</p>}</div><h2>Recruiter summary</h2><p className="longCopy">{candidate.summary || 'No recruiter summary.'}</p></section>
      <section className="surfaceCard candidateSection" id="applications"><div className="sectionTitle"><div><small>APPLICATIONS</small><h2>Hiring roles</h2></div><span>{applications.totalItems || 0}</span></div>{jobPairs.length ? <div className="applicationList">{jobPairs.map(([application, job]) => <Link href={job ? `/dashboard/jobs/${job.id}` : '#'} key={application.id}><div><b>{job?.title || 'Unavailable job'}</b><small>{job?.department || '—'}</small></div><mark>{application.stage}</mark></Link>)}</div> : <div className="inlineEmpty"><b>Not attached to a job.</b><p>A job assignment can be selected while adding a candidate.</p></div>}</section>
      <InterviewHistory workspaceId={workspace.id} candidateId={candidate.id}/>
    </main><aside>
      <section className="surfaceCard candidateFacts"><small>CONTACT</small><dl><div><dt>Email</dt><dd><a href={`mailto:${candidate.email}`}>{candidate.email}</a></dd></div><div><dt>Phone</dt><dd>{candidate.phone || 'Not provided'}</dd></div><div><dt>Location</dt><dd>{candidate.location || 'Not provided'}</dd></div><div><dt>LinkedIn</dt><dd>{candidate.linkedin_url ? <a href={candidate.linkedin_url} target="_blank" rel="noreferrer">Open profile</a> : 'Not provided'}</dd></div><div><dt>Portfolio</dt><dd>{candidate.portfolio_url ? <a href={candidate.portfolio_url} target="_blank" rel="noreferrer">Open portfolio</a> : 'Not provided'}</dd></div></dl></section>
      <section className="surfaceCard candidateFacts"><small>DATA & PRIVACY</small><dl><div><dt>Source</dt><dd>{candidate.source}</dd></div><div><dt>Consent</dt><dd>{candidate.consent_status}</dd></div><div><dt>Consent recorded</dt><dd>{displayDate(candidate.consent_at)}</dd></div><div><dt>Resume parsing</dt><dd>{candidate.resume_parse_status}</dd></div><div><dt>Created</dt><dd>{displayDate(candidate.created)}</dd></div></dl>{candidate.resume ? <div className="resumeActions"><Link className="resumeButton primaryResumeAction" href={`/dashboard/candidates/${candidate.id}/resume-analysis`}>Analyze resume &rarr;</Link><a className="resumeButton" href={`/api/candidates/${candidate.id}/resume`} target="_blank" rel="noreferrer">View secure resume &rarr;</a></div> : <p className="emptyCopy">No resume uploaded.</p>}</section>
      <section className="surfaceCard candidateFacts" id="activity"><small>RECENT ACTIVITY</small>{activities.items?.length ? <ol className="activityList">{activities.items.map((activity) => <li key={activity.id}><b>{activity.action.replaceAll('.', ' ')}</b><span>{displayDate(activity.created)}</span></li>)}</ol> : <p className="emptyCopy">No activity recorded.</p>}</section>
    </aside></div>
  </div>;
}
