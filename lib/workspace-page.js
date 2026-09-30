import 'server-only';
import { redirect } from 'next/navigation';
import { getWorkspaceContext } from './recruit-data';
import { requireApprovedAccount } from './access';

export async function requireWorkspace() {
  const { userId, email, user } = await requireApprovedAccount();
  let context;
  try {
    context = await getWorkspaceContext(userId);
  } catch {
    redirect('/dashboard/onboarding?database=offline');
  }
  if (!context) redirect('/dashboard/onboarding');
  return { ...context, userId, email, user };
}
