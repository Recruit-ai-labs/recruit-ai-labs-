import Link from 'next/link';
import Pagination,{pageNumber} from '../components/Pagination';
import { canManageCandidates, listCandidatesForWorkspace } from '../../../lib/recruit-data';
import { requireWorkspace } from '../../../lib/workspace-page';

export const dynamic = 'force-dynamic';

export default async function CandidatesPage({ searchParams }) {
  const { workspace, membership } = await requireWorkspace();
  const query = await searchParams;
  const search = String(query?.search || '').slice(0, 100);
  const status = String(query?.status || '');
  const source = String(query?.source || '');
  const result = await listCandidatesForWorkspace(workspace.id, { search, status, source, page:pageNumber(query?.page) });
  const canManage = canManageCandidates(membership);
  return (
    <div className="productPage">
      {query?.deleted === '1' && <p className="candidateDeletedNotice" role="status">Candidate deleted successfully.</p>}
      <div className="pageHeading"><div><p className="pageEyebrow">TALENT CRM</p><h1>Candidates</h1><p>Real candidate records, resumes and hiring activity in one workspace.</p></div>{canManage && <Link className="primaryAction" href="/dashboard/candidates/new">Add candidate <span>+</span></Link>}</div>
      <form className="moduleToolbar candidateToolbar"><div><strong>{result.totalItems || 0}</strong><span>total candidates</span></div><label className="moduleSearch"><span>&#9906;</span><input name="search" aria-label="Search candidates" placeholder="Name, email or role" defaultValue={search} /></label><select name="status" aria-label="Filter by status" defaultValue={status}><option value="">All statuses</option><option value="active">Active</option><option value="do-not-contact">Do not contact</option><option value="archived">Archived</option></select><select name="source" aria-label="Filter by source" defaultValue={source}><option value="">All sources</option><option value="manual">Manual</option><option value="referral">Referral</option><option value="career-site">Career site</option><option value="import">Imported</option><option value="sourced">Sourced</option></select><button type="submit">Apply</button>{(search || status || source) && <Link href="/dashboard/candidates">Clear</Link>}</form>
      <section className="dataSurface"><div className="dataHeader candidateColumns"><span>Candidate</span><span>Current role</span><span>Location</span><span>Status</span></div>{result.items?.length ? <div className="dataRows">{result.items.map((candidate) => <Link className="dataRow candidateColumns clickableRow" href={`/dashboard/candidates/${candidate.id}`} key={candidate.id}><div className="candidateIdentity"><b className="candidateAvatar">{`${candidate.first_name?.[0] || ''}${candidate.last_name?.[0] || ''}`.toUpperCase()}</b><div><strong>{candidate.preferred_name || [candidate.first_name, candidate.last_name].filter(Boolean).join(' ')}</strong><small>{candidate.email}</small></div></div><span>{candidate.current_title ? `${candidate.current_title}${candidate.current_company ? ` at ${candidate.current_company}` : ''}` : '—'}</span><span>{candidate.location || '—'}</span><mark className={`candidateStatus ${candidate.status}`}>{candidate.status}</mark></Link>)}</div> : <div className="emptyState"><div className="emptyMark"><span /><span /><span /></div><small>NO CANDIDATES FOUND</small><h2>{search || status || source ? 'No candidates match these filters.' : 'Add your first candidate securely.'}</h2><p>{search || status || source ? 'Clear or adjust your filters.' : 'Create a factual candidate profile and optionally attach a PDF or DOCX resume.'}</p>{canManage && !search && !status && !source && <Link className="primaryAction emptyAction" href="/dashboard/candidates/new">Add candidate <span>&rarr;</span></Link>}</div>}</section>
      <Pagination result={result} path="/dashboard/candidates" query={query}/>
    </div>
  );
}
