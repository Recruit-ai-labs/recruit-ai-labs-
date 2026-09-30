import Link from 'next/link';
import {requireWorkspace} from '../../../lib/workspace-page';
import {canManageCandidates} from '../../../lib/recruit-data';
import {getHiringDeskData} from '../../../lib/hiring-desk-data';
import {candidateName, ageDays, taskState, followupDraft} from '../../../lib/hiring-desk.mjs';
import TaskTools from './TaskTools';
import DecisionCompare from './DecisionCompare';
import './desk.css';
import './desk-polish.css';

const titles = {today: 'Today', 'decision-room': 'Decision Room', 'follow-ups': 'Follow-ups'};

function DeskIcon({type}) {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>;
}

export default async function DeskPage({mode, searchParams}) {
  const params = await searchParams;
  const page = Math.max(1, Math.min(10000, Number.parseInt(params?.page, 10) || 1));
  const job = typeof params?.job === 'string' ? params.job : '';
  const showAll = params?.show === 'all';
  const {workspace, membership} = await requireWorkspace();
  let data;
  try { data = await getHiringDeskData(workspace.id, {page, job}); }
  catch { return <div className="hiringDesk"><h1>{titles[mode]}</h1><p role="alert">Workspace records could not be loaded. No data has been changed.</p><Link href={`/dashboard/${mode}`}>Try again</Link></div>; }

  const canManage = canManageCandidates(membership);
  const date = new Date().toISOString().slice(0, 10);
  const visible = key => { const state = taskState(data.events, key); return showAll || (state.kind !== 'done' && (!state.due || state.due <= date)); };
  const eligible = id => data.candidates.find(candidate => candidate.id === id && candidate.status === 'active' && candidate.consent_status !== 'withdrawn');
  const role = id => data.relatedJobs.find(item => item.id === id)?.title || 'Role unavailable';
  const cards = [];

  if (mode !== 'decision-room') for (const application of data.applications.items) {
    const candidate = eligible(application.candidate), key = `application:${application.id}`, age = ageDays(application.applied_at || application.created);
    if (!candidate || !visible(key) || (!showAll && (age === null || age < 3))) continue;
    cards.push({key, type: 'application', candidate, role: role(application.job), label: 'Application follow-up',
      reason: age === null ? 'The application date needs review before planning a follow-up.' : `${age} days have passed since this application was received.`,
      detail: `Current stage: ${application.stage || 'Not recorded'}`, action: 'Review application', href: `/dashboard/jobs/${encodeURIComponent(application.job)}/pipeline`});
  }

  const selectedJob = [...data.jobs.items, ...data.relatedJobs].find(item => item.id === job);
  const totalPages = data.applications.totalPages || 1;
  const pageLink = next => `/dashboard/${mode}?${new URLSearchParams({job, page: String(next), ...(showAll ? {show: 'all'} : {})})}`;
  const applicationCount = cards.filter(card => card.type === 'application').length;

  return <div className={`hiringDesk ${mode === 'today' ? 'todayDesk' : ''}`}>
    <header className="deskHero"><small>{mode === 'today' ? `YOUR HIRING DESK / ${new Intl.DateTimeFormat('en-IN', {day: 'numeric', month: 'long'}).format(new Date())}` : 'HIRING WORKSPACE / REVIEW & FOLLOW THROUGH'}</small><h1>{mode === 'today' ? 'Your hiring day, made clear.' : titles[mode]}</h1><p>{mode === 'decision-room' ? 'Review candidates against the same role criteria, application stage and human notes.' : mode === 'today' ? 'A focused list of applications that need human follow-through today. Nothing here changes a hiring stage automatically.' : 'Keep ownership, reminders and follow-up drafts alongside real applications.'}</p></header>
    <nav className="deskFilters" aria-label="Hiring desk">{Object.entries(titles).map(([path, title]) => <Link key={path} href={`/dashboard/${path}`} aria-current={path === mode ? 'page' : undefined}>{title}</Link>)}</nav>

    {mode === 'today' && <section className="todayBrief" aria-labelledby="today-brief-title"><div className="todayBriefMark"><DeskIcon type="application"/></div><div><span>Morning brief</span><h2 id="today-brief-title">{cards.length ? `${cards.length} ${cards.length === 1 ? 'item needs' : 'items need'} your attention` : 'Your priority queue is clear'}</h2><p>Review overdue applications and plan the next follow-up.</p></div><dl><div><dt>Applications</dt><dd>{applicationCount}</dd></div><div><dt>Queue status</dt><dd>{cards.length ? 'Open' : 'Clear'}</dd></div></dl></section>}

    <form className="deskFilters" method="get"><label>{mode === 'today' ? 'Focus on a role' : 'Role'}<select name="job" defaultValue={job}><option value="">All roles</option>{data.jobs.items.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}{selectedJob && !data.jobs.items.some(item => item.id === job) && <option value={job}>{selectedJob.title}</option>}</select></label>{mode !== 'decision-room' && <label><input type="checkbox" name="show" value="all" defaultChecked={showAll}/> {mode === 'today' ? 'Show completed, upcoming and new items too' : 'Include handled, future reminders and new applications'}</label>}<button>{mode === 'today' ? 'Update view' : 'Apply filters'}</button></form>
    {data.jobs.totalPages > 1 && <p className="deskNotice">Role selector shows the first 200 active roles. You can filter another role using its job ID in the URL&apos;s job parameter.</p>}
    {mode !== 'today' && <p className="deskMuted">Page {page} of {Math.max(1, totalPages || 1)}. Up to 50 applications per page. Counts and comparisons apply only to loaded records. Reminder dates use UTC; no automatic messages are sent.</p>}

    {mode === 'decision-room' ? selectedJob ? <DecisionCompare key={`${job}:${page}`} applications={data.applications.items} candidates={data.candidates} job={selectedJob} events={data.events} canManage={canManage}/> : <p className="deskEmpty">Choose a role to compare its active candidates. No cross-role ranking or inferred skill scores.</p>
      : mode === 'today' ? <div className="todayLayout"><main className="todayQueue" aria-labelledby="today-queue-title"><div className="todayQueueHead"><div><span>Priority queue</span><h2 id="today-queue-title">What to do next</h2></div><p>{cards.length} open</p></div>
        {cards.map((card, index) => { const state = taskState(data.events, card.key); return <article className="todayTask" key={card.key}><span className="todayTaskOrder">{String(index + 1).padStart(2, '0')}</span><span className={`todayTaskIcon ${card.type}`}><DeskIcon type={card.type}/></span><div className="todayTaskBody"><span className="todayTaskLabel">{card.label}</span><h3>{candidateName(card.candidate)}</h3><p className="todayTaskRole">{card.role}</p><p className="todayTaskReason">{card.reason}</p><small>{card.detail}</small>{state.owner && <small>Owner: {state.owner}</small>}{state.due && <small>Reminder: {state.due}</small>}</div><div className="todayTaskActions"><Link className="todayPrimary" href={card.href}>{card.action}<span aria-hidden="true">→</span></Link><TaskTools recordKey={card.key} canManage={canManage} history={data.events.filter(event => event.metadata?.key === card.key)} summaryLabel="Plan or mark handled"/></div></article>; })}
        {!cards.length && <div className="todayEmpty"><span><DeskIcon type="application"/></span><h3>Nothing needs attention right now</h3><p>Try another role, or include completed and upcoming items to see the wider queue.</p></div>}
      </main><aside className="todayGuide"><span>How Today works</span><h2>A queue, not a verdict.</h2><ol><li><b>Review</b><p>Open the original application and candidate record.</p></li><li><b>Decide the next step</b><p>Add a note, assign an owner or set a reminder.</p></li><li><b>Clear the item</b><p>Mark it handled when the follow-through is complete.</p></li></ol><p className="todayGuideNote">Handled is only a task marker. It never makes a hiring decision or sends a message.</p><details><summary>About this queue</summary><p>Application follow-ups appear after three days. Dates use UTC. This page loads up to 50 applications at a time.</p></details></aside></div>
      : <><p className="deskNotice">Application follow-ups begin three days after applying. &quot;Handled&quot; is a task marker, not a hiring decision. Existing email permissions and consent checks still apply.</p><div className="deskGrid">{cards.map(card => { const state = taskState(data.events, card.key); return <article className="deskCard" key={card.key}><span className="deskPill">{card.label}</span><h2>{candidateName(card.candidate)}</h2><h3>{card.role}</h3><p>{card.reason}</p><p>{card.detail}</p>{state.owner && <small>Owner ID: {state.owner}</small>}{state.due && <p>Reminder: {state.due}</p>}{state.kind === 'done' && <p>Task handled</p>}<p><Link href={card.href}>Open record</Link>{mode === 'follow-ups' && <> | <Link href={`/dashboard/candidates/${encodeURIComponent(card.candidate.id)}/communication`}>Review &amp; send email</Link></>}</p><TaskTools recordKey={card.key} canManage={canManage} draft={mode === 'follow-ups' ? followupDraft(candidateName(card.candidate), card.role) : undefined} history={data.events.filter(event => event.metadata?.key === card.key)}/></article>; })}</div>{!cards.length && <p className="deskEmpty">No matching tasks on this page. Check other pages or include handled/new items.</p>}</>}
    <nav className="deskFilters" aria-label="Queue pages">{page > 1 && <Link href={pageLink(page - 1)}>Previous page</Link>}{page < totalPages && <Link href={pageLink(page + 1)}>Next page</Link>}</nav>
  </div>;
}
