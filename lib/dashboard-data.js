import 'server-only';
import { listRecords, pbFilterValue } from './pocketbase';

export async function getDashboardData(workspaceId, now = new Date()) {
  const scope = `workspace = "${pbFilterValue(workspaceId)}"`;
  const query = (collection, filter = '', options = {}) => listRecords(collection, {
    filter: scope + (filter ? ` && (${filter})` : ''), perPage: 1, ...options,
  });
  const stages = ['new', 'screening', 'assessment', 'offer', 'hired', 'rejected'];
  const [jobs, candidates, pipeline] = await Promise.all([
    query('jobs', 'status = "open"', { perPage: 5, sort: '-updated' }),
    query('candidates', 'status = "active"', { perPage: 5, sort: '-created' }),
    Promise.all(stages.map(async stage => ({ stage, count: (await query('applications',
      `stage = "${stage}" && status != "withdrawn"${['hired', 'rejected'].includes(stage) ? '' : ' && status = "active"'}`)).totalItems || 0 }))),
  ]);
  return { jobs, candidates, pipeline,
    activeApplications: pipeline.filter(item => !['hired', 'rejected'].includes(item.stage)).reduce((sum, item) => sum + item.count, 0) };
}
