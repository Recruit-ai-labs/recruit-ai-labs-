'use server';

import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { createWorkspaceForUser } from '../../../lib/recruit-data';

const companySizes = new Set(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']);
const hiringGoals = new Set(['build-team', 'hire-faster', 'improve-quality', 'organize-pipeline', 'agency-delivery']);
const jobFunctions = new Set(['founder-owner', 'talent-leader', 'recruiter', 'hiring-manager', 'interviewer', 'operations']);

const value = (formData, key) => String(formData.get(key) || '').trim();

export async function completeOnboarding(_previousState, formData) {
  const { userId } = await auth();
  if (!userId) return { error: 'Your session has expired. Please sign in again.' };

  const input = {
    companyName: value(formData, 'companyName'), website: value(formData, 'website'),
    companySize: value(formData, 'companySize'), hiringGoal: value(formData, 'hiringGoal'),
    name: value(formData, 'name'), jobFunction: value(formData, 'jobFunction'),
  };
  const fieldErrors = {};
  if (input.companyName.length < 2 || input.companyName.length > 120) fieldErrors.companyName = 'Enter a company name between 2 and 120 characters.';
  if (!companySizes.has(input.companySize)) fieldErrors.companySize = 'Select your company size.';
  if (!hiringGoals.has(input.hiringGoal)) fieldErrors.hiringGoal = 'Select a primary hiring goal.';
  if (input.name.length < 2 || input.name.length > 120) fieldErrors.name = 'Enter your full name.';
  if (!jobFunctions.has(input.jobFunction)) fieldErrors.jobFunction = 'Select your role.';
  if (input.website) {
    try { new URL(input.website); } catch { fieldErrors.website = 'Enter a complete URL, for example https://company.com.'; }
  }
  if (Object.keys(fieldErrors).length) return { fieldErrors, error: 'Check the highlighted information.' };

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!email) return { error: 'A verified email address is required to create a workspace.' };

  try {
    await createWorkspaceForUser({ ...input, clerkUserId: userId, email });
  } catch (error) {
    console.error('Workspace creation failed:', error?.message);
    return { error: 'We could not create your workspace. Check the PocketBase connection and try again.' };
  }
  redirect('/dashboard');
}
