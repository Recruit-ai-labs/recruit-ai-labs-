import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getWorkspaceContext } from '../../../lib/recruit-data';
import OnboardingForm from './OnboardingForm';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  let context;
  try { context = await getWorkspaceContext(userId); } catch {
    return <div className="connectionState"><span>DATABASE OFFLINE</span><h1>Connect PocketBase to continue.</h1><p>The app could not reach <code>POCKETBASE_URL</code>. Start PocketBase on the configured address, confirm the admin credentials, then refresh this page.</p><a className="primaryAction" href="/dashboard">Try dashboard again</a></div>;
  }
  if (context) redirect('/dashboard');
  const user = await currentUser();
  const defaultName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');
  return <OnboardingForm defaultName={defaultName} />;
}
