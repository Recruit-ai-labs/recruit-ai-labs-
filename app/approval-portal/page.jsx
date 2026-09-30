import { requireApprovalAdmin } from '../../lib/access';
import { getTursoClient } from '../../lib/turso';
import AccessSignOut from '../components/AccessSignOut';
import ApprovalButton from './ApprovalButton';
import './portal.css';

export const metadata = { title: 'Approval portal | Recruit AI', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';
export default async function ApprovalPortal({ searchParams }) {
  await requireApprovalAdmin();
  const query = await searchParams, filter = ['pending', 'approved'].includes(query?.status) ? query.status : 'pending';
  const search = typeof query?.q === 'string' ? query.q.trim().slice(0, 120) : '';
  const page = Math.max(1, Math.min(100000, Number.parseInt(query?.page, 10) || 1));
  const db = getTursoClient(), where = ' WHERE status=? AND (email LIKE ? ESCAPE \'!\' OR name LIKE ? ESCAPE \'!\' OR company LIKE ? ESCAPE \'!\')';
  const pattern = `%${search.replace(/[!%_]/g, '!$&')}%`, args = [filter, pattern, pattern, pattern];
  const [counts, records, count] = await Promise.all([
    db.execute('SELECT COUNT(*) AS total, SUM(status=\'pending\') AS review, SUM(status=\'approved\') AS approved FROM access_requests'),
    db.execute({ sql: `SELECT * FROM access_requests${where} ORDER BY number ASC LIMIT 30 OFFSET ?`, args: [...args, (page - 1) * 30] }),
    db.execute({ sql: `SELECT COUNT(*) AS total FROM access_requests${where}`, args }),
  ]);
  const stats = counts.rows[0], total = Number(count.rows[0].total);
  const pageLink = (next) => `/approval-portal?${new URLSearchParams({ status: filter, q: search, page: String(next) })}`;
  return <main className="approvalPage"><header className="approvalNav"><a href="/" className="logo"><img src="/recruit-ai-logo.png" alt="" width="30" height="30" />Recruit <i>AI</i></a><span>ACCESS MANAGEMENT</span><AccessSignOut /></header>
    <section className="approvalHeading"><p className="reportEyebrow">THE APPROVAL PORTAL</p><h1>A thoughtful start.<br /><em>For every team.</em></h1><p>Review applications, approve access and keep applicants informed.</p></section>
    <section className="approvalStats" aria-label="Application overview"><div><span>Total applications</span><strong>{Number(stats.total || 0)}</strong></div><div><span>Ready for your review</span><strong>{Number(stats.review || 0)}</strong></div><div><span>Access approved</span><strong>{Number(stats.approved || 0)}</strong></div></section>
    <section className="approvalInbox"><div className="approvalTools"><nav aria-label="Application status"><a aria-current={filter === 'pending' ? 'page' : undefined} href="?status=pending">Waiting list</a><a aria-current={filter === 'approved' ? 'page' : undefined} href="?status=approved">Approved</a></nav><form><input type="hidden" name="status" value={filter} /><input type="search" name="q" defaultValue={search} placeholder="Search name, email or company" aria-label="Search applications" maxLength={120} /><button type="submit">Search</button></form></div>
      <div className="approvalList">{records.rows.length ? records.rows.map((row) => <article className="approvalCard" key={row.number}><div className="approvalCardHead"><span className="approvalNumber">#{String(row.number).padStart(4, '0')}</span><span className={`approvalBadge ${row.status}`}>{row.status === 'approved' ? 'Approved' : row.submitted_at ? 'Ready for review' : 'Email verified'}</span><small>Joined {new Date(Number(row.created_at)).toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' })}</small></div><h2>{row.name || 'Application started'}</h2><a className="approvalEmail" href={`mailto:${row.email}`}>{row.email}</a>{row.submitted_at ? <><dl><div><dt>Company</dt><dd>{row.company}</dd></div><div><dt>Hiring volume</dt><dd>{row.volume}</dd></div><div><dt>Phone</dt><dd>{row.phone || 'Not provided'}</dd></div></dl><div className="approvalNote"><span>HIRING NEEDS</span><p>{row.message}</p></div></> : <p className="approvalMuted">Email verified. Application details have not been submitted yet.</p>}<footer>{row.status === 'approved' ? <><span>Approved {new Date(Number(row.approved_at)).toLocaleDateString('en-GB', { timeZone: 'UTC' })}</span>{row.notification_sent_at ? <span className="approvalDelivered">✓ Approval email sent</span> : <ApprovalButton number={Number(row.number)} retry />}</> : <><span>{row.submitted_at ? 'Their next login will open their workspace.' : 'You can approve this verified email now.'}</span><ApprovalButton number={Number(row.number)} /></>}</footer></article>) : <div className="approvalEmpty"><span>✓</span><h2>{search ? 'No matching applications' : filter === 'approved' ? 'Your approved teams will appear here.' : 'You’re all caught up.'}</h2><p>{search ? 'Try another name, email or company.' : 'New requests appear here after email verification.'}</p></div>}</div>
      <div className="approvalPagination"><span>{total} {filter} application{total === 1 ? '' : 's'}</span><div>{page > 1 && <a href={pageLink(page - 1)}>← Previous</a>}{page * 30 < total && <a href={pageLink(page + 1)}>Next →</a>}</div></div>
    </section><footer className="approvalBottom">Recruit AI · Human-reviewed access</footer>
  </main>;
}
