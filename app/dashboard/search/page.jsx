import Link from 'next/link';
import { requireWorkspace } from '../../../lib/workspace-page';
import { listRecords, pbFilterValue } from '../../../lib/pocketbase';
export default async function SearchPage({ searchParams }) {
  const { workspace } = await requireWorkspace();
  const query = await searchParams;
  const q = String(query?.q || '').trim().slice(0, 160);
  const page = Math.max(1, Math.min(10000, Number.parseInt(query?.page, 10) || 1));
  const groups = [
    { collection: 'candidates', title: 'Candidates', fields: ['first_name','last_name','email','current_title','current_company'], label: r => `${r.first_name} ${r.last_name || ''}`, href: r => `/dashboard/candidates/${r.id}` },
    { collection: 'jobs', title: 'Jobs', fields: ['title','department','location'], label: r => r.title, href: r => `/dashboard/jobs/${r.id}` },
    { collection: 'interviews', title: 'Interviews', fields: ['title'], label: r => r.title, href: r => `/dashboard/interviews/${r.id}/${r.candidate_answers?.length ? 'candidate-response' : 'scorecard'}` },
    { collection: 'talent_pools', title: 'Talent pools', fields: ['name','description'], label: r => r.name, href: r => `/dashboard/talent-pool/${r.id}` },
  ];
  const results = q ? await Promise.all(groups.map(group => listRecords(group.collection, { filter: `workspace = "${pbFilterValue(workspace.id)}" && (${group.fields.map(field => `${field} ~ "${pbFilterValue(q)}"`).join(' || ')})`, page, perPage: 20, sort: '-updated' }))) : [];
  const pages = Math.max(1, ...results.map(r => r.totalPages || 0));
  return <div className="productPage"><h1>Search workspace</h1><form className="moduleToolbar"><input name="q" aria-label="Search records" defaultValue={q} maxLength={160}/><button type="submit">Search</button></form>{!q ? <p>Enter a name, email, job title or pool name.</p> : <><p>{results.reduce((n,r) => n + r.totalItems,0)} results for “{q}”</p>{groups.map((group,index) => <section key={group.collection} className="surfaceCard settingsCard"><h2>{group.title} ({results[index].totalItems})</h2>{results[index].items.length ? <ul>{results[index].items.map(record => <li key={record.id}><Link href={group.href(record)}>{group.label(record)}</Link>{record.email && <span> — {record.email}</span>}</li>)}</ul> : <p>No results on this page.</p>}</section>)}<nav aria-label="Search pages">{page > 1 && <Link href={`/dashboard/search?q=${encodeURIComponent(q)}&page=${page-1}`}>Previous</Link>} <span>Page {page} of {pages}</span> {page < pages && <Link href={`/dashboard/search?q=${encodeURIComponent(q)}&page=${page+1}`}>Next</Link>}</nav></>}</div>;
}
