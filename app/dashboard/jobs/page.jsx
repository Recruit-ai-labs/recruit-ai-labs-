import Link from 'next/link';
import Pagination,{pageNumber} from '../components/Pagination';
import { canManageJobs, listJobsForWorkspace } from '../../../lib/recruit-data';
import { requireWorkspace } from '../../../lib/workspace-page';

export const dynamic = 'force-dynamic';

export default async function JobsPage({ searchParams }) {
  const { workspace, membership } = await requireWorkspace();
  const query = await searchParams;
  const search = String(query?.search || '').slice(0, 100);
  const status = String(query?.status || '');
  const result = await listJobsForWorkspace(workspace.id, { search, status, page:pageNumber(query?.page) });
  const canManage = canManageJobs(membership);
  return (
    <div className="productPage">
      <div className="pageHeading"><div><p className="pageEyebrow">HIRING WORK</p><h1>Jobs</h1><p>Create role briefs and manage every hiring pipeline from one place.</p></div>{canManage && <Link className="primaryAction" href="/dashboard/jobs/new">Create job <span>+</span></Link>}</div>
      <form className="moduleToolbar jobsToolbar"><div><strong>{result.totalItems || 0}</strong><span>total jobs</span></div><label className="moduleSearch"><span>&#9906;</span><input name="search" aria-label="Search jobs" placeholder="Search jobs" defaultValue={search} /></label><select name="status" aria-label="Filter by status" defaultValue={status}><option value="">All statuses</option><option value="draft">Draft</option><option value="open">Open</option><option value="paused">Paused</option><option value="closed">Closed</option><option value="archived">Archived</option></select><button type="submit">Apply</button>{(search || status) && <Link href="/dashboard/jobs">Clear</Link>}</form>
      <section className="dataSurface">
        <div className="dataHeader"><span>Role</span><span>Department</span><span>Location</span><span>Status</span></div>
        {result.items?.length ? <div className="dataRows">{result.items.map((job) => <Link className="dataRow four clickableRow" href={`/dashboard/jobs/${job.id}`} key={job.id}><div><b>{job.title}</b><small>{job.openings || 1} opening{job.openings === 1 ? '' : 's'}</small></div><span>{job.department || '—'}</span><span>{job.location || '—'}</span><mark className={`jobStatus ${job.status}`}>{job.status || 'draft'}</mark></Link>)}</div> : <div className="emptyState"><div className="emptyMark"><span /><span /><span /></div><small>NO JOBS FOUND</small><h2>{search || status ? 'No jobs match these filters.' : 'Create your first structured hiring brief.'}</h2><p>{search || status ? 'Clear the filters or adjust your search.' : 'Define the role, requirements and evidence criteria before candidates enter the process.'}</p>{canManage && !search && !status && <Link className="primaryAction emptyAction" href="/dashboard/jobs/new">Create job <span>&rarr;</span></Link>}</div>}
      </section>
      <Pagination result={result} path="/dashboard/jobs" query={query}/>
    </div>
  );
}
