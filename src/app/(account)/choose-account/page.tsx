import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { readAccount } from "@/lib/account";

import RoleChoice from "../../_account/RoleChoice";

export const metadata: Metadata = {
  title: "Choose your account | Recruit AI",
  robots: { index: false, follow: false },
};

// Where sign-in and sign-up land. The role already on the account decides
// whether this is a genuine fork or a bounce back into the flow — so a
// refresh, a bookmark or an old link can never strand somebody here.
export default async function ChooseAccountPage() {
  const account = await readAccount();
  if (!account) redirect("/sign-in");

  if (account.role === "seeker") {
    redirect(account.profile.completedAt ? "/seeker" : "/onboarding");
  }

  return <RoleChoice email={account.email} />;
}
