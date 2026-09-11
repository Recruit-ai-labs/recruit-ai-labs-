import Link from 'next/link';

const number = value => (value || 0).toLocaleString('en-IN');
const title = value => value.replaceAll('-', ' ').replaceAll('_', ' ');
function Empty({ children, href, action }) {
  return <div className="overviewEmpty"><span aria-hidden="true">◇</span><p>{children}</p>{href && <Link href={href}>{action} →</Link>}</div>;
}
function Heading({ title, subtitle, href, action = 'View all' }) {
  return <header className="overviewSectionHead"><div><h2>{title}</h2><p>{subtitle}</p></div>{href && <Link href={href}>{action} ↗</Link>}</header>;
}
function InterviewLink({ interview }) {
  const date = interview.starts_at && Number.isFinite(Date.parse(interview.starts_at)) ? new Date(interview.starts_at) : null;
  return <Link className="overviewInterview" href={`/dashboard/interviews/${interview.id}/${interview.candidate_answers?.length ? 'candidate-response' : 'scorecard'}`}>
    <span className="overviewCalendar" aria-hidden="true">{date ? <><small>{date.toLocaleDateString('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' })}</small><b>{date.toLocaleDateString('en-IN', { day: '2-digit', timeZone: 'Asia/Kolkata' })}</b></> : '—'}</span>
    <span><b>{interview.title || 'Candidate interview'}</b><small>{date ? `${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })} IST · ` : ''}{title(interview.interview_type || 'Interview')}</small></span><span aria-hidden="true">↗</span>
  </Link>;
}

export default function DashboardOverview({ data, name, workspaceName, canManage }) {
  const { jobs, candidates, interviews, completedInterviews, pipeline, activeApplications } = data;
  const largestStage = Math.max(1, ...pipeline.map(item => item.count));
  const newApplications = pipeline.find(item => item.stage === 'new')?.count || 0;
  const metrics = [
    ['Open roles', jobs.totalItems, 'Currently accepting candidates', '/dashboard/jobs?status=open'],
    ['Active candidates', candidates.totalItems, 'People in your talent network', '/dashboard/candidates?status=active'],
    ['Active pipeline', activeApplications, 'Applications before a final decision', '/dashboard/analytics'],
    ['Upcoming interviews', interviews.totalItems, 'Scheduled from now onwards', '/dashboard/interviews'],
  ];
  return <div className="productPage overviewPage">
    <header className="pageHeading overviewHeading"><div><p className="pageEyebrow">WORKSPACE / OVERVIEW</p><h1>Your hiring, at a glance.</h1><p>Welcome back, {name}. Here’s what’s happening at {workspaceName}.</p></div><div className="overviewHeadingActions"><Link className="overviewSecondary" href="/dashboard/analytics">View analytics ↗</Link>{canManage && <Link className="primaryAction" href="/dashboard/jobs/new">+ Create job</Link>}</div></header>
    <section className="overviewMetrics" aria-label="Hiring overview">{metrics.map(([label, value, note, href], index) => <Link href={href} key={label} className="overviewMetric"><div><span>{label}</span><span className={`overviewMetricIcon icon${index}`} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d={['M4 8h16v12H4zM9 8V4h6v4M4 13h16M10 13v3h4v-3','M16 21v-3a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v3M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8M18 8v6M15 11h6','M4 20V10h4v10M10 20V4h4v16M16 20V8h4v12','M4 5h16v16H4zM8 3v4M16 3v4M4 10h16M8 14h3M8 17h6'][index]}/></svg></span></div><strong>{number(value)}</strong><small>{note}</small><span className="overviewMetricArrow" aria-hidden="true">↗</span></Link>)}</section>
    <div className="overviewColumns"><div className="overviewMainColumn">
      <section className="overviewPanel"><Heading title="Hiring pipeline" subtitle="Current stage distribution · excludes withdrawn applications" href="/dashboard/analytics" action="Full report"/><div className="overviewPipeline">{pipeline.map(({ stage, count }, index) => <div key={stage}><div className="overviewBarTrack" aria-hidden="true"><div className={`overviewBar stage${index}`} style={{ height: `${count / largestStage * 100}%` }} /></div><strong>{number(count)}</strong><span>{title(stage)}</span></div>)}</div><footer className="overviewPanelFoot"><span><i /> {number(activeApplications)} active applications</span><Link href="/dashboard/jobs">Manage pipelines →</Link></footer></section>
      <section className="overviewPanel"><Heading title="Open roles" subtitle="Your most recently updated open positions" href="/dashboard/jobs?status=open"/>{jobs.items?.length ? <div className="overviewTableWrap"><table className="overviewTable"><thead><tr><th>Role</th><th>Workplace</th><th>Openings</th><th>Pipeline</th></tr></thead><tbody>{jobs.items.map(job => <tr key={job.id}><td><Link href={`/dashboard/jobs/${job.id}`}>{job.title}</Link><small>{job.department || 'No department'}</small></td><td><span>{job.location || 'Not specified'}</span><small>{title(job.workplace_type || 'Not specified')}</small></td><td>{number(job.openings)}</td><td><Link className="overviewTableAction" href={`/dashboard/jobs/${job.id}/pipeline`}>View →</Link></td></tr>)}</tbody></table></div> : <Empty href={canManage ? '/dashboard/jobs/new' : undefined} action="Create a job">No open roles yet. Your live positions will appear here.</Empty>}</section>
      <section className="overviewPanel"><Heading title="Recent candidates" subtitle="Newest active additions to your workspace" href="/dashboard/candidates"/>{candidates.items?.length ? <div className="overviewCandidates">{candidates.items.map(candidate => <Link href={`/dashboard/candidates/${candidate.id}`} key={candidate.id}><span className="overviewAvatar">{candidate.first_name?.[0]}{candidate.last_name?.[0]}</span><span><b>{[candidate.first_name, candidate.last_name].filter(Boolean).join(' ') || 'Candidate'}</b><small>{candidate.current_title || 'Profile ready to review'}</small></span><span className="overviewSource">{title(candidate.source || 'manual')}</span><span aria-hidden="true">↗</span></Link>)}</div> : <Empty href={canManage ? '/dashboard/candidates/new' : undefined} action="Add a candidate">Build your talent network by adding your first candidate.</Empty>}</section>
    </div><aside className="overviewSideColumn">
      <section className="overviewFocus"><span className="overviewFocusLabel">NEXT STEPS</span><h2>Keep hiring moving.</h2><p>{newApplications ? `${number(newApplications)} new applications are ready for an initial review.` : 'A clear next step for every role and candidate.'}</p><Link href="/dashboard/jobs">Review applications <span>→</span></Link><Link href="/dashboard/discovery">Discover talent <span>↗</span></Link></section>
      <section className="overviewPanel"><Heading title="Upcoming interviews" subtitle="Next on your schedule · times in IST" href="/dashboard/interviews"/>{interviews.items?.length ? interviews.items.map(interview => <InterviewLink key={interview.id} interview={interview}/>) : <Empty href={canManage ? '/dashboard/interviews/new' : undefined} action="Schedule interview">Your upcoming interviews will appear here.</Empty>}</section>
      <section className="overviewPanel"><Heading title="Completed interviews" subtitle={`${number(completedInterviews.totalItems)} completed · responses and scorecards`} href="/dashboard/interviews"/>{completedInterviews.items?.length ? completedInterviews.items.map(interview => <InterviewLink key={interview.id} interview={interview}/>) : <Empty>Completed interviews and their scorecards will appear here.</Empty>}</section>
      <Link className="overviewTalentLink" href="/dashboard/talent-pool"><span><b>Build your talent bench</b><small>Organize candidates for future roles</small></span><span aria-hidden="true">↗</span></Link>
    </aside></div>
  </div>;
}
