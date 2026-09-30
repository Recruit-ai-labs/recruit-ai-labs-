import Link from 'next/link';
import DeleteCandidate from '../DeleteCandidate';
import {notFound} from 'next/navigation';
import {canManageCandidates, getCandidateForWorkspace, getJobForWorkspace, listCandidateActivities, listCandidateApplications, listCandidatesForWorkspace} from '../../../../lib/recruit-data';
import {requireWorkspace} from '../../../../lib/workspace-page';
import {changeCandidateStatusAction} from '../actions';
import './candidate-profile.css';
import CandidateTabs from './CandidateTabs';
import TechDNA from './TechDNA';
export const maxDuration = 120;

const displayDate = value => value ? new Date(value).toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: 'numeric'}) : 'Not recorded';

export default async function CandidatePage({params}) {
  const {candidateId} = await params;
  const {workspace, membership} = await requireWorkspace();
  const candidate = await getCandidateForWorkspace(workspace.id, candidateId);
  if (!candidate) notFound();

  const [applications, activities, candidatePage] = await Promise.all([
    listCandidateApplications(workspace.id, candidate.id),
    listCandidateActivities(workspace.id, candidate.id),
    listCandidatesForWorkspace(workspace.id),
  ]);
  const jobPairs = await Promise.all((applications.items || []).map(async application => [application, await getJobForWorkspace(workspace.id, application.job)]));

  const canManage = canManageCandidates(membership);
  const nextStatuses = candidate.status === 'active' ? ['do-not-contact', 'archived'] : candidate.status === 'do-not-contact' ? ['active', 'archived'] : ['active'];
  const fullName = [candidate.first_name, candidate.last_name].filter(Boolean).join(' ');
  const candidateIndex = (candidatePage.items || []).findIndex(item => item.id === candidate.id);
  const previousCandidate = candidateIndex > 0 ? candidatePage.items[candidateIndex - 1] : null;
  const nextCandidate = candidateIndex >= 0 ? candidatePage.items[candidateIndex + 1] : null;

  const profile = <div className="candidateDossier" id="profile"><main>
    <section className="candidateDossierSection"><h2>Professional overview</h2><p className="candidateDossierLead">{candidate.summary || 'No recruiter-authored professional overview has been added yet.'}</p><dl className="candidateDossierFacts"><div><dt>Current position</dt><dd>{candidate.current_title || 'Not recorded'}{candidate.current_company ? ` at ${candidate.current_company}` : ''}</dd></div><div><dt>Total experience</dt><dd>{candidate.total_experience != null && candidate.total_experience !== '' ? `${candidate.total_experience} years` : 'Not recorded'}</dd></div><div><dt>Notice period</dt><dd>{candidate.notice_period_days != null && candidate.notice_period_days !== '' ? `${candidate.notice_period_days} days` : 'Not recorded'}</dd></div><div><dt>Source</dt><dd>{candidate.source || 'Not recorded'}</dd></div></dl></section>
    <section className="candidateDossierSection"><div className="candidateDossierHeading"><h2>Skills</h2><span>{candidate.skills?.length || 0} recorded</span></div>{candidate.skills?.length ? <div className="candidateDossierSkills">{candidate.skills.map(skill => <span key={skill}>{skill}</span>)}</div> : <p className="candidateDossierEmpty">No profile skills recorded. Resume analysis or recruiter review can add verified skills.</p>}</section>
    <section className="candidateDossierSection"><div className="candidateDossierHeading"><h2>Hiring roles</h2><span>{applications.totalItems || 0} applications</span></div>{jobPairs.length ? <div className="candidateRoleHistory">{jobPairs.map(([application, job]) => <Link href={job ? `/dashboard/jobs/${job.id}/pipeline` : '/dashboard/jobs'} key={application.id}><div><h3>{job?.title || 'Unavailable job'}</h3><p>{job?.department || 'Department not recorded'}</p></div><span>{application.stage}</span></Link>)}</div> : <p className="candidateDossierEmpty">This candidate is not attached to a hiring role.</p>}</section>
  </main><aside className="candidateDossierAside"><section><h2>Contact</h2><dl><div><dt>Email</dt><dd><a href={`mailto:${candidate.email}`}>{candidate.email}</a></dd></div><div><dt>Phone</dt><dd>{candidate.phone || 'Not provided'}</dd></div><div><dt>Location</dt><dd>{candidate.location || 'Not provided'}</dd></div><div><dt>LinkedIn</dt><dd>{candidate.linkedin_url ? <a href={candidate.linkedin_url} target="_blank" rel="noreferrer">Open profile</a> : 'Not provided'}</dd></div><div><dt>Portfolio</dt><dd>{candidate.portfolio_url ? <a href={candidate.portfolio_url} target="_blank" rel="noreferrer">Open portfolio</a> : 'Not provided'}</dd></div></dl></section><section><h2>Resume</h2>{candidate.resume ? <div className="candidateDossierResume"><a href={`/api/candidates/${candidate.id}/resume`} target="_blank" rel="noreferrer">View resume</a><Link href={`/dashboard/candidates/${candidate.id}/resume-analysis`}>Analyze resume</Link></div> : <p>No resume uploaded.</p>}</section><section><h2>Record</h2><dl><div><dt>Consent</dt><dd>{candidate.consent_status || 'Not recorded'}</dd></div><div><dt>Created</dt><dd>{displayDate(candidate.created)}</dd></div></dl></section></aside></div>;

  const applicationPanel = <div className="candidateFlatPanel"><div className="candidateDossierHeading"><h2>Applications</h2><span>{applications.totalItems || 0} total</span></div>{jobPairs.length ? <div className="candidateRoleHistory">{jobPairs.map(([application, job]) => <Link href={job ? `/dashboard/jobs/${job.id}/pipeline` : '/dashboard/jobs'} key={application.id}><div><h3>{job?.title || 'Unavailable job'}</h3><p>{job?.department || 'Department not recorded'}</p></div><span>{application.stage}</span></Link>)}</div> : <p className="candidateDossierEmpty">No applications recorded.</p>}</div>;
  const activityPanel = <div className="candidateFlatPanel"><div className="candidateDossierHeading"><h2>Activity</h2><span>{activities.items?.length || 0} events</span></div><div className="candidateTimeline">{(activities.items || []).map(activity => <article key={activity.id}><span/><div><b>{activity.action.replaceAll('.', ' ')}</b><p>Candidate record updated</p></div><time>{displayDate(activity.created)}</time></article>)}</div>{!activities.items?.length && <p className="candidateDossierEmpty">No activity recorded yet.</p>}</div>;

  return <div className="productPage candidateProfile"><section className="candidateDetailFrame">
    <nav className="candidateDetailTopbar" aria-label="Candidate navigation"><Link className="candidateDetailTitle" href="/dashboard/candidates">Candidate details</Link><div><Link className={!previousCandidate ? 'isDisabled' : ''} aria-disabled={!previousCandidate} tabIndex={previousCandidate ? undefined : -1} href={previousCandidate ? `/dashboard/candidates/${previousCandidate.id}` : '#'}>&lsaquo; Previous</Link><Link className={!nextCandidate ? 'isDisabled' : ''} aria-disabled={!nextCandidate} tabIndex={nextCandidate ? undefined : -1} href={nextCandidate ? `/dashboard/candidates/${nextCandidate.id}` : '#'}>Next &rsaquo;</Link></div><Link className="candidateDetailClose" href="/dashboard/candidates" aria-label="Close candidate details">&times;</Link></nav>
    <section className="candidateReviewHeader"><header className="candidateProfileHeader"><div className="candidateHeroAvatar">{`${candidate.first_name?.[0] || ''}${candidate.last_name?.[0] || ''}`.toUpperCase()}</div><div className="candidateIdentityBlock"><div className="candidateNameLine"><h1>{candidate.preferred_name || fullName}</h1></div>{candidate.preferred_name && <small>Legal name: {fullName}</small>}<p><span aria-hidden="true">&#9678;</span> {candidate.location || 'Location not provided'}</p></div><div className="candidateHeaderActions"><Link href={`/dashboard/candidates/${candidate.id}/communication`}>Email</Link></div></header>
      <div className="candidateQuickChips"><span className={`candidateStatus ${candidate.status}`}>{candidate.status}</span><span>{candidate.total_experience != null && candidate.total_experience !== '' ? `${candidate.total_experience} years experience` : 'Experience not recorded'}</span><span>{applications.totalItems || 0} application{applications.totalItems === 1 ? '' : 's'}</span></div>
      <dl className="candidateReviewMeta"><div><dt>Current role</dt><dd>{candidate.current_title || 'Not recorded'}</dd></div><div><dt>Notice period</dt><dd>{candidate.notice_period_days != null && candidate.notice_period_days !== '' ? `${candidate.notice_period_days} days` : 'Not recorded'}</dd></div><div><dt>Added</dt><dd>{displayDate(candidate.created)}</dd></div></dl>
    </section>
    {canManage && <details className="candidateRecordControls"><summary>More actions</summary><div>{candidate.status !== 'archived' && <Link href={`/dashboard/candidates/${candidate.id}/edit`}>Edit profile</Link>}{nextStatuses.map(status => <form action={changeCandidateStatusAction} key={status}><input type="hidden" name="candidateId" value={candidate.id}/><input type="hidden" name="status" value={status}/><button type="submit" disabled={status === 'active' && candidate.consent_status === 'withdrawn'}>{status === 'active' ? 'Restore active' : status}</button></form>)}<DeleteCandidate candidateId={candidate.id} candidateName={candidate.preferred_name || fullName}/></div></details>}
    <CandidateTabs count={applications.totalItems || 0} profile={profile} applications={applicationPanel} activity={activityPanel} dna={<TechDNA workspaceId={workspace.id} candidateId={candidate.id} canManage={canManage}/>}/>
  </section></div>;
}
