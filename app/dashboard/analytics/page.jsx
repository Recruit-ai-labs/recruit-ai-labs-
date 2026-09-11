import { requireWorkspace } from '../../../lib/workspace-page';
import { getAnalyticsData } from '../../../lib/analytics-data';
import AnalyticsOverview from '../components/AnalyticsOverview';

export const dynamic = 'force-dynamic';
export default async function AnalyticsPage() {
  const { workspace } = await requireWorkspace();
  const data = await getAnalyticsData(workspace.id);
  return <AnalyticsOverview data={data} />;
}
