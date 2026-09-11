import { auth, currentUser } from '@clerk/nextjs/server';
import { getWorkspaceContext } from '../../lib/recruit-data';
import AppShell from './components/AppShell';
import './dashboard.css';
import './overview.css';

export default async function DashboardLayout({ children }) {
  const { userId } = await auth();
  const user = await currentUser();
  let context = null;
  let databaseReady = true;
  try { if (userId) context = await getWorkspaceContext(userId); } catch { databaseReady = false; }
  const userName = user?.firstName || user?.fullName || user?.username || 'Recruiter';
  return <AppShell workspaceName={context?.workspace?.name} userName={userName} databaseReady={databaseReady}>{children}</AppShell>;
}
