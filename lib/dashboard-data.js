import 'server-only';
import { listRecords, pbFilterValue } from './pocketbase';

export async function getDashboardData(workspaceId, now = new Date()) {
  const scope = `workspace = "${pbFilterValue(workspaceId)}"`;
  const query = (collection, filter = '', options = {}) => listRecords(collection, {
    filter: scope + (filter ? ` && (${filter})` : ''), perPage: 1, ...options,
  });
  const stages = ['new', 'screening', 'interview', 'assessment', 'offer', 'hired', 'rejected'];
  const [jobs, candidates, interviews, completedInterviews, pipeline] = await Promise.all([
    query('jobs', 'status = "open"', { perPage: 5, sort: '-updated' }),
    query('candidates', 'status = "active"', { perPage: 5, sort: '-created' }),
    query('interviews', `status = "scheduled" && starts_at >= "${now.toISOString().replace('T', ' ')}"`, { perPage: 4, sort: 'starts_at' }),
    query('interviews', 'status = "completed"', { perPage: 4, sort: '-updated' }),
    Promise.all(stages.map(async stage => ({ stage, count: (await query('applications',
      `stage = "${stage}" && status != "withdrawn"${['hired', 'rejected'].includes(stage) ? '' : ' && status = "active"'}`)).totalItems || 0 }))),
  ]);
  return { jobs, candidates, interviews, completedInterviews, pipeline,
    activeApplications: pipeline.filter(item => !['hired', 'rejected'].includes(item.stage)).reduce((sum, item) => sum + item.count, 0) };
}
