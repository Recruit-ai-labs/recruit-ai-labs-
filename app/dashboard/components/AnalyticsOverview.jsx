import Link from 'next/link';
const number = value => value.toLocaleString('en-IN');
export default function AnalyticsOverview({ data }) {
  const totalInterviews = data.interviewCounts.reduce((sum, item) => sum + item.count, 0);
  const totalCandidates = data.sourceCounts.reduce((sum, item) => sum + item.count, 0);
  const largestStage = Math.max(1, ...data.stages.map(item => item.count));
  return <div className="productPage overviewPage analyticsPage">
    <header className="pageHeading overviewHeading"><div><p className="pageEyebrow">WORKSPACE / ANALYTICS</p><h1>Understand your hiring.</h1><p>Live workspace totals, from first application to final decision.</p></div><Link className="overviewSecondary" href="/dashboard">Back to overview ↗</Link></header>
    <section className="overviewMetrics" aria-label="Hiring metrics">{[
      ['Open roles', number(data.openRoles), 'Currently accepting candidates', '/dashboard/jobs?status=open'],
      ['Active pipeline', number(data.active), 'Applications awaiting a final decision', '/dashboard/jobs'],
      ['Hired', number(data.hired), 'Applications in the hired stage', '/dashboard/jobs'],
      ['Hire conversion', `${data.conversion}%`, 'Hired / non-withdrawn pipeline applications', '/dashboard/jobs'],
    ].map(([label, value, note, href]) => <Link className="overviewMetric" href={href} key={label}><div>{label}</div><strong>{value}</strong><small>{note}</small></Link>)}</section>
    <section className="overviewPanel"><header className="overviewSectionHead"><div><h2>Applications by stage</h2><p>{number(data.total)} pipeline applications · {number(data.withdrawn)} withdrawn excluded</p></div><Link href="/dashboard/jobs">Manage pipelines ↗</Link></header><div className="overviewPipeline">{data.stages.map(({ stage, count }, index) => <div key={stage}><div className="overviewBarTrack" aria-hidden="true"><div className={`overviewBar stage${index}`} style={{ height: `${count / largestStage * 100}%` }}/></div><strong>{number(count)}</strong><span>{stage}</span></div>)}</div>{data.total === 0 && <div className="overviewPanelFoot">Your pipeline chart will fill as candidates are added to roles.</div>}</section>
    <div className="analyticsDetailGrid">
      <section className="overviewPanel"><header className="overviewSectionHead"><div><h2>Interview operations</h2><p>{number(totalInterviews)} interviews across all dates</p></div><Link href="/dashboard/interviews">View interviews ↗</Link></header><dl className="analyticsBreakdown">{data.interviewCounts.map(({ status, count }) => <div key={status}><dt>{status.replaceAll('-', ' ')}</dt><dd>{number(count)}</dd></div>)}</dl></section>
      <section className="overviewPanel"><header className="overviewSectionHead"><div><h2>Candidate sources</h2><p>{number(totalCandidates)} candidates · includes archived profiles</p></div><Link href="/dashboard/candidates">View candidates ↗</Link></header>{totalCandidates ? <dl className="analyticsBreakdown">{data.sourceCounts.filter(item => item.count > 0).map(({ source, count }) => <div key={source}><dt>{source.replaceAll('-', ' ')}</dt><dd>{number(count)} <small>{Math.round(count / totalCandidates * 100)}%</small></dd></div>)}</dl> : <div className="overviewEmpty"><p>No candidate sources yet. Add candidates to see which channels bring talent to your workspace.</p></div>}</section>
    </div>
  </div>;
}
