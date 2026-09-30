import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireWorkspace } from '../../../../../lib/workspace-page';
import { canManageJobs, getJobForWorkspace } from '../../../../../lib/recruit-data';
import { interviewDB } from '../../../../../lib/tech-dna-store';
import CopyLink from '../../../components/CopyLink';
import InterviewSetup from './InterviewSetup';
import { revokeSireenLink } from './actions';
import '../../../../interview/sireen.css';
export const maxDuration = 120;
export default async function InterviewLinkPage({ params }) {
  const { jobId } = await params;
  const { workspace, membership } = await requireWorkspace();
  const job = await getJobForWorkspace(workspace.id, jobId);
  if (!job) notFound();
  let links = [], unavailable = false;
  try { const db = await interviewDB(); links = (await db.execute({ sql: 'SELECT l.*, (SELECT COUNT(*) FROM sireen_sessions s WHERE s.link=l.id) AS applicants FROM sireen_links l WHERE l.workspace=? AND l.job=? ORDER BY l.created DESC LIMIT 20', args: [workspace.id, job.id] })).rows; } catch { unavailable = true; }
  return <div className="productPage dnaWorkspace"><Link className="backLink" href={`/dashboard/jobs/${job.id}`}>← {job.title}</Link><header className="dnaPageHeader"><div><span className="dnaEyebrow">SIREEN INTERVIEWS</span><h1>Create an interview</h1><p>Create a link, share it with candidates, and review their answers in the candidate profile.</p></div><span className="dnaPill">TECH DNA · V1</span></header>
    <div className="dnaStudioGrid"><section className="dnaCard"><span className="dnaEyebrow">INTERVIEW SETUP</span><h2>{job.title}</h2><p>Sireen understands the JD, starts with the candidate’s resume, then follows the evidence across five questions.</p><div className="dnaStats"><div><b>05</b><span>Adaptive questions</span></div><div><b>06</b><span>Evidence dimensions</span></div><div><b>03</b><span>Incident limit</span></div></div>{canManageJobs(membership) ? <InterviewSetup jobId={job.id} open={job.status === 'open'}/> : <p>Ask a recruiter to create an interview.</p>}</section>
    <aside className="dnaCard dnaDark"><span className="dnaEyebrow">THE CANDIDATE JOURNEY</span><ol className="dnaJourney">{['Introduce yourself & add your resume','Meet Sireen and review instructions','Check camera, microphone & fullscreen','Answer five connected questions','Receive confirmation; HR gets Tech DNA'].map((step, i) => <li key={step}><span>{String(i + 1).padStart(2,'0')}</span>{step}</li>)}</ol><p>Role-specific evidence. Visible uncertainty. Every assessment linked to an answer.</p></aside></div>
    <section className="dnaSection"><h2>Interview invitations</h2>{unavailable && <p role="alert">Interview storage is unavailable. Configure the Turso database to create invitations.</p>}{!links.length && !unavailable && <div className="dnaEmpty">Your first interview starts here. Generate a link to see the role rubric and share it with candidates.</div>}{links.map(link => { const bp = JSON.parse(link.blueprint); const inactive = link.revoked || link.expires < new Date().toISOString(); return <article className="dnaCard" key={link.id}><div className="dnaBetween"><div><span className="dnaEyebrow">{inactive ? 'INACTIVE' : 'READY TO SHARE'}</span><h3>{bp.role}</h3></div><span className="dnaPill">{link.applicants} applicants</span></div><p>{bp.mission}</p>{!inactive && <CopyLink path={`/interview/${link.token}`}/>}<div className="dnaCriteriaTags">{bp.criteria.map(c => <span key={c.id} title={c.expectation}>{c.name} · {c.weight}×</span>)}</div><details><summary>View the assessment rubric</summary>{bp.criteria.map(c => <p key={c.id}><strong>{c.name}:</strong> {c.expectation}</p>)}</details><div className="dnaBetween"><small>Expires {new Date(link.expires).toLocaleDateString('en-IN')} · Rubric frozen at creation</small>{!inactive && canManageJobs(membership) && <form action={revokeSireenLink}><input type="hidden" name="linkId" value={link.id}/><button className="dnaTextButton">Revoke link</button></form>}</div></article>; })}</section>
  </div>;
}
