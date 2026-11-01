import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { readAccount } from "@/lib/account";

import SeekerOnboarding from "../../_account/SeekerOnboarding";

export const metadata: Metadata = {
  title: "Set up your profile | Recruit AI",
  robots: { index: false, follow: false },
};

// The five steps that turn a Clerk account into a job seeker profile. A
// seeker who already finished is sent to their home; somebody who never
// chose a role is sent back to the fork.
export default async function OnboardingPage() {
  const account = await readAccount();
  if (!account) redirect("/sign-in");
  if (account.role !== "seeker") redirect("/choose-account");
  if (account.profile.completedAt) redirect("/seeker");

  return (
    <SeekerOnboarding
      email={account.email}
      initialProfile={account.profile}
    />
  );
}
