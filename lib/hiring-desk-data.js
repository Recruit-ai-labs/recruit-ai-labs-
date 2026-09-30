import 'server-only';
import {listRecords, pbFilterValue} from './pocketbase';

// Explicitly paginated application queues; no hidden whole-workspace scans or AI calls.
export async function getHiringDeskData(workspaceId, {page = 1, job = ''} = {}) {
  page = Number.isSafeInteger(page) && page > 0 ? page : 1;
  const scope = `workspace = "${pbFilterValue(workspaceId)}"`;
  const query = (collection, extra = '', options = {}) => listRecords(collection, {
    filter: scope + (extra ? ` && (${extra})` : ''), perPage: 50, ...options,
  });
  const jobScope = job ? ` && job = "${pbFilterValue(job)}"` : '';
  const [applications, jobs] = await Promise.all([
    query('applications', `status = "active" && stage != "hired" && stage != "rejected" && stage != "offer"${jobScope}`, {page, sort: 'applied_at'}),
    query('jobs', 'status != "archived"', {perPage: 200, fields: 'id,title,must_have_skills'}),
  ]);
  const candidateIds = [...new Set(applications.items.map(item => item.candidate).filter(Boolean))];
  const jobIds = [...new Set(applications.items.map(item => item.job).filter(Boolean))];
  const recordIds = applications.items.map(item => item.id);
  const or = (field, ids) => ids.map(id => `${field} = "${pbFilterValue(id)}"`).join(' || ');
  const all = async (collection, extra, fields) => {
    const rows = []; let index = 1, count = 1;
    do {
      const result = await query(collection, extra, {page: index, perPage: 200, sort: '-created', ...(fields ? {fields} : {})});
      rows.push(...result.items); count = result.totalPages || 1; index++;
      if (index > 100 && index <= count) throw Error('Too many history records. Narrow this view to a role.');
    } while (index <= count);
    return rows;
  };
  const [candidates, relatedJobs, events] = await Promise.all([
    candidateIds.length ? all('candidates', or('id', candidateIds), 'id,first_name,last_name,status,consent_status') : [],
    jobIds.length ? all('jobs', or('id', jobIds), 'id,title,must_have_skills') : [],
    recordIds.length ? all('activities', `action = "hiring-desk.event" && (${or('entity_id', recordIds)})`) : [],
  ]);
  return {applications, jobs, candidates, relatedJobs, events};
}
