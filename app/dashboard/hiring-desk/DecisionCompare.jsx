'use client';
import {useState} from 'react';
import Link from 'next/link';
import {candidateName} from '../../../lib/hiring-desk.mjs';
import TaskTools from './TaskTools';
import Icon from '../components/Icon';

export default function DecisionCompare({applications, candidates, job, events, canManage}) {
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState('');
  const choices = applications.filter(app => candidates.some(candidate => candidate.id === app.candidate && candidate.status === 'active' && candidate.consent_status !== 'withdrawn'));
  const visibleChoices = choices.filter(app => candidateName(candidates.find(candidate => candidate.id === app.candidate)).toLowerCase().includes(search.toLowerCase()));
  const compared = choices.filter(app => selected.includes(app.id));
  const skills = Array.isArray(job.must_have_skills) ? job.must_have_skills : [];
  const notesFor = app => events.filter(event => event.metadata?.key === `application:${app.id}` && ['note', 'work-sample'].includes(event.metadata?.kind));
  return <>
    <section className="decisionIntake"><div className="reviewSectionHeading"><Icon name="users"/><div><h2>Build your comparison</h2><p>Select up to four candidates for {job.title}. Review the same role requirements for everyone.</p></div><span className="reviewBadge">{selected.length} / 4 selected</span></div>
      <div className="decisionToolbar"><label className="decisionSearch">Find a candidate<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by name"/></label><button disabled={!selected.length} onClick={() => setSelected([])}>Clear selection</button></div>
      <div className="deskSelection">{visibleChoices.map(app => <label key={app.id}><input type="checkbox" checked={selected.includes(app.id)} disabled={selected.length >= 4 && !selected.includes(app.id)} onChange={() => setSelected(current => current.includes(app.id) ? current.filter(id => id !== app.id) : [...current, app.id])}/><span><b>{candidateName(candidates.find(candidate => candidate.id === app.candidate))}</b><small>{(app.stage || 'Not recorded').replaceAll('-', ' ')} · {notesFor(app).length} review notes</small></span></label>)}</div>
      {!visibleChoices.length && <p className="deskEmpty">{choices.length ? 'No candidates match this search.' : 'No eligible active applications on this page for this role.'}</p>}
    </section>
    {!!selected.length && <section className="decisionMatrix"><div className="reviewSectionHeading"><div><h2>Review checklist</h2><p>This view organizes recorded evidence. It does not infer ability or rank candidates.</p></div><button type="button" onClick={() => window.print()}>Print / save review as PDF</button></div><div className="decisionTableScroll" tabIndex={0} role="region" aria-label="Candidate review comparison"><table><thead><tr><th scope="col">Role requirement</th>{compared.map(app => <th key={app.id} scope="col">{candidateName(candidates.find(candidate => candidate.id === app.candidate))}</th>)}</tr></thead><tbody>{skills.map(skill => <tr key={skill}><th scope="row">{skill}</th>{compared.map(app => <td key={app.id}><span className="reviewBadge">Human review needed</span></td>)}</tr>)}<tr><th scope="row">Review notes</th>{compared.map(app => <td key={app.id}>{notesFor(app).length} recorded</td>)}</tr><tr><th scope="row">Application stage</th>{compared.map(app => <td key={app.id}>{(app.stage || 'Not recorded').replaceAll('-', ' ')}</td>)}</tr></tbody></table></div>{!skills.length && <p className="deskMuted">Add required skills to this job to enable a criteria-by-criteria checklist.</p>}</section>}
    {!selected.length && !!choices.length && <div className="reviewEmpty"><Icon name="layers" size={32}/><h3>Compare candidates consistently</h3><p>Select candidates above to review role requirements, recorded notes and next steps side by side.</p></div>}
    <div className="deskCompare">{compared.map(app => { const candidate = candidates.find(item => item.id === app.candidate); const key = `application:${app.id}`; return <article className="deskCard" key={app.id}><span className="deskPill">{app.stage || 'No stage'}</span><h2>{candidateName(candidate)}</h2><p>{notesFor(app).length} review notes recorded.</p><p className="deskMuted">Open the original candidate and application records before making a decision.</p><p><Link href={`/dashboard/candidates/${encodeURIComponent(app.candidate)}`}>Open candidate</Link> · <Link href={`/dashboard/jobs/${encodeURIComponent(app.job)}/pipeline`}>Open role pipeline</Link></p><TaskTools recordKey={key} history={events.filter(event => event.metadata?.key === key)} canManage={canManage}/></article>; })}</div>
  </>;
}
