'use client';

import {useState} from 'react';

const candidates = [
  {name:'Aarav Mehta',initials:'AM',role:'Product Designer',resume:96,interview:92,score:94,status:'Shortlisted',note:'Strong design systems experience. Clear reasoning and evidence from shipped products.'},
  {name:'Rhea Kapoor',initials:'RK',role:'Senior UX Designer',resume:93,interview:89,score:91,status:'In review',note:'Strong research portfolio. Follow up on cross-functional delivery and ownership.'},
  {name:'Kabir Sharma',initials:'KS',role:'Product Designer',resume:89,interview:83,score:86,status:'Next round',note:'Solid product thinking. Explore interaction design depth in the next round.'},
  {name:'Ananya Rao',initials:'AR',role:'UX Designer',resume:82,interview:null,score:null,status:'Interview pending',note:'Resume screening complete. Interview evidence and overall score are pending.'},
];

export default function ReportsPreview(){
  const [selected,setSelected]=useState(candidates[0]);
  return <section id="reports" className="reportsSection">
    <div className="sectionHead"><div><p className="reportEyebrow">REPORTS & CANDIDATE INSIGHTS</p><h2>Every candidate.<br/><strong>Every score. <em>One clear picture.</em></strong></h2></div><a className="outlineBtn" href="/demo">Explore reports ↗</a></div>
    <p className="reportsIntro">See who is moving forward, how they performed and what needs a closer look. Keep the evidence beside every hiring decision.</p>
    <div className="reportPanel"><div className="reportToolbar"><div><b>Candidate performance</b><p>Senior Product Designer · Sample hiring report</p></div><span className="reportSample">Illustrative data</span></div>
      <div className="reportStats">{[['04','Candidates'],['03','Interviews completed'],['90.3','Average overall / 100'],['01','Shortlisted']].map(([value,label])=><div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div>
      <div className="reportTableScroll" tabIndex={0} role="region" aria-label="Candidate scores"><table className="reportTable"><thead><tr>{['Candidate','Resume / 100','Interview / 100','Overall / 100','Status','Report'].map(label=><th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{candidates.map(candidate=><tr key={candidate.name} className={selected.name===candidate.name?'reportSelected':''}><td><div className="reportPerson"><span>{candidate.initials}</span><div><b>{candidate.name}</b><small>{candidate.role}</small></div></div></td><td>{candidate.resume}</td><td>{candidate.interview??'Pending'}</td><td><b className="reportScore">{candidate.score??'—'}</b></td><td><span className={'reportStatus '+(candidate.status==='Shortlisted'?'positive':'')}>{candidate.status}</span></td><td><button type="button" aria-pressed={selected.name===candidate.name} onClick={()=>setSelected(candidate)}>View <span className="reportSrOnly">{candidate.name}'s report</span>↗</button></td></tr>)}</tbody></table></div>
      <div className="reportEvidence" aria-live="polite"><span>✦</span><div><b>{selected.name} · Evidence summary</b><p>{selected.note}</p><small>Sample overall score: equal weighting of resume and interview marks. Final decisions stay with your team.</small></div></div>
    </div>
  </section>;
}
