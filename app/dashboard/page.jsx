import { currentUser } from '@clerk/nextjs/server';
import { requireWorkspace } from '../../lib/workspace-page';
import { canManageJobs } from '../../lib/recruit-data';
import { getDashboardData } from '../../lib/dashboard-data';
import DashboardOverview from './components/DashboardOverview';

export const dynamic = 'force-dynamic';
export default async function DashboardPage() {
  const { workspace, membership } = await requireWorkspace();
  const [data, user] = await Promise.all([getDashboardData(workspace.id), currentUser()]);
  return <DashboardOverview data={data} name={user?.firstName || 'there'} workspaceName={workspace.name} canManage={canManageJobs(membership)} />;
}
