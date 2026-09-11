import 'server-only';
import { listRecords, pbFilterValue } from './pocketbase';

export const analyticsStages = ['new', 'screening', 'interview', 'assessment', 'offer', 'hired', 'rejected'];
const sources = ['manual', 'referral', 'career-site', 'import', 'sourced'];

export async function getAnalyticsData(workspaceId) {
  const scope = `workspace = "${pbFilterValue(workspaceId)}"`;
  const count = async (collection, filter = '') => {
    const result = await listRecords(collection, {
      filter: scope + (filter ? ` && (${filter})` : ''),
      perPage: 1, fields: 'id',
    });
    return result.totalItems || 0;
  };
  // Counts are calculated in the database; no resumes, answers or record scans.
  const [openRoles, stages, interviewCounts, sourceCounts, withdrawn] = await Promise.all([
    count('jobs', 'status = "open"'),
    Promise.all(analyticsStages.map(async stage => ({ stage, count: await count('applications',
      `stage = "${stage}" && status != "withdrawn"${['hired', 'rejected'].includes(stage) ? '' : ' && status = "active"'}`) }))),
    Promise.all(['scheduled', 'completed', 'cancelled', 'no-show'].map(async status => ({ status, count: await count('interviews', `status = "${status}"`) }))),
    Promise.all([...sources, 'other'].map(async source => ({ source, count: await count('candidates', source === 'other'
      ? sources.map(value => `source != "${value}"`).join(' && ')
      : `source = "${source}"`) }))),
    count('applications', 'status = "withdrawn"'),
  ]);
  const total = stages.reduce((sum, item) => sum + item.count, 0);
  const hired = stages.find(item => item.stage === 'hired').count;
  const active = stages.filter(item => !['hired', 'rejected'].includes(item.stage)).reduce((sum, item) => sum + item.count, 0);
  return { openRoles, stages, interviewCounts, sourceCounts, total, active, hired, withdrawn,
    conversion: total ? Math.round(hired / total * 100) : 0 };
}
