import 'server-only';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getWorkspaceContext } from './recruit-data';

export async function requireWorkspace() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  let context;
  try {
    context = await getWorkspaceContext(userId);
  } catch {
    redirect('/dashboard/onboarding?database=offline');
  }
  if (!context) redirect('/dashboard/onboarding');
  return { ...context, userId };
}
