import Link from 'next/link';
import WorkspaceAssistant from './WorkspaceAssistant';
import Icon from './Icon';

const shortcuts = [
  ['Find talent', 'Search for people who fit your role.', '/dashboard/discovery', 'users'],
  ['Follow up', 'Keep candidate conversations moving.', '/dashboard/follow-ups', 'clock'],
  ['Review candidates', 'Compare experience and interview evidence.', '/dashboard/candidates', 'layers'],
];
export default function DashboardOverview({ name = 'there', data, canManage }) {
  const jobs = data.jobs?.items || [];
  const stages = (data.pipeline || []).filter(item => !['rejected', 'hired'].includes(item.stage));
  const max = Math.max(1, ...stages.map(item => item.count));
  return <div className="productPage hiringOverview">
    <header className="pageHeading"><div><p className="overviewKicker">YOUR HIRING WORKSPACE</p><h1>Good to see you, {name}.</h1><p>A clear view of your hiring. A simple next step.</p></div>{canManage && <Link className="primaryAction" href="/dashboard/jobs/new">Create job <span aria-hidden="true">+</span></Link>}</header>
    <section className="overviewMetrics" aria-label="Workspace summary">
      {[[data.jobs?.totalItems || 0, 'Open jobs', '/dashboard/jobs?status=open', 'briefcase'], [data.candidates?.totalItems || 0, 'Active candidates', '/dashboard/candidates', 'users'], [data.activeApplications || 0, 'Active applications', '/dashboard/today', 'layers']].map(([count, label, href, icon]) => <Link key={label} href={href}><div><Icon name={icon}/><span>{label}</span><Icon name="arrow" size={16}/></div><strong>{count}</strong><small>View details</small></Link>)}
    </section>
    <div className="overviewWorkGrid">
      <section className="surfaceCard overviewRoles"><div className="overviewSectionTitle"><div><h2>Your open roles</h2><p>Open a role to manage candidates or create an interview.</p></div><Link href="/dashboard/jobs">All jobs →</Link></div>{jobs.length ? <div>{jobs.map(job => <Link className="overviewRoleRow" href={`/dashboard/jobs/${job.id}`} key={job.id}><span className="overviewRoleIcon"><Icon name="briefcase"/></span><div><strong>{job.title}</strong><small>{[job.department, job.location].filter(Boolean).join(' · ') || 'Role details available inside'}</small></div><span className="jobStatus open">Open</span><Icon name="arrow" size={17}/></Link>)}</div> : <div className="overviewEmpty"><Icon name="briefcase" size={28}/><h3>Your next great hire starts here.</h3><p>{canManage ? 'Create a job, define what matters, then invite candidates.' : 'Open roles will appear here once your team publishes a job.'}</p>{canManage && <Link className="primaryAction" href="/dashboard/jobs/new">Create your first job</Link>}</div>}</section>
      <section className="surfaceCard overviewPipeline"><div className="overviewSectionTitle"><div><h2>Hiring progress</h2><p>Active applications by stage</p></div></div>{stages.map(item => <div className="overviewStage" key={item.stage}><div><span>{item.stage === 'new' ? 'New applications' : item.stage.charAt(0).toUpperCase() + item.stage.slice(1)}</span><b>{item.count}</b></div><div className="overviewTrack"><span style={{ width: `${item.count / max * 100}%` }}/></div></div>)}<Link className="overviewTextLink" href="/dashboard/today">View today’s priorities →</Link></section>
    </div>
    <section className="overviewShortcuts" aria-label="Quick actions">{shortcuts.map(([label, copy, href, icon]) => <Link key={label} href={href}><Icon name={icon}/><div><h2>{label}</h2><p>{copy}</p></div><Icon name="arrow" size={18}/></Link>)}</section>
    <details className="overviewAssistant"><summary><Icon name="spark"/><div><strong>Need a hand? Ask Recruit AI.</strong><span>Get help with your workspace and next steps.</span></div><span className="overviewAssistantToggle">Open assistant</span></summary><WorkspaceAssistant name={name}/></details>
  </div>;
}
