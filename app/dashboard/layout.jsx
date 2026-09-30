import { getWorkspaceContext } from '../../lib/recruit-data';
import AppShell from './components/AppShell';
import './daisy.css';
import './dashboard.css';
import './overview.css';
import './design-system.css';
import './pro-gates.css';
import './studio.css';
import './responsive-polish.css';
import './workspace-refresh.css';
import { requireApprovedAccount } from '../../lib/access';
import ProtectedSession from '../components/ProtectedSession';
import { workspaceEntitlements } from '../../lib/usage-entitlements';

export default async function DashboardLayout({ children }) {
  const { userId, user } = await requireApprovedAccount();
  let context = null;
  let databaseReady = true;
  let isPro = false;
  try { if (userId) { context = await getWorkspaceContext(userId); if (context?.workspace) isPro = (await workspaceEntitlements(context.workspace.id)).plan === 'pro'; } } catch { databaseReady = false; }
  const userName = user?.firstName || user?.fullName || user?.username || 'Recruiter';
  return <ProtectedSession scope="dashboard"><AppShell workspaceName={context?.workspace?.name} userName={userName} databaseReady={databaseReady} isPro={isPro}>{children}</AppShell></ProtectedSession>;
}
