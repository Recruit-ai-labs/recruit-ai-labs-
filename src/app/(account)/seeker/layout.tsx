import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { readAccount } from "@/lib/account";
import { readMedia } from "@/lib/media";
import { emptyMedia, mediaUrl } from "@/lib/media-types";
import { unreadMessages } from "@/lib/messages";
import { readNetworkCounts } from "@/lib/network";
import { unreadNotifications } from "@/lib/notifications";
import type { SocialBadges } from "@/lib/social-types";

import SeekerShell from "../../_account/seeker/SeekerShell";

// The workspace gate lives here, once: every /seeker route asks the same
// three questions and every one of them gets the same answer. Pages below
// this layout can assume a signed-in, onboarded job seeker.
export const metadata: Metadata = {
  title: { default: "Your career | Recruit AI", template: "%s | Recruit AI" },
  robots: { index: false, follow: false },
};

export default async function SeekerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const account = await readAccount();

  if (!account) redirect("/sign-in");
  if (account.role !== "seeker") redirect("/choose-account");
  if (!account.profile.completedAt) redirect("/onboarding");

  // The bar, the menu and the drawer all show the same face; it is read
  // once here and passed down rather than fetched by each of them. A
  // database that cannot answer leaves the initials in place.
  const [media, badges] = await Promise.all([
    readMedia(account.userId).catch(() => emptyMedia()),
    readBadges(account.userId),
  ]);

  return (
    <SeekerShell
      viewer={{
        firstName: account.profile.firstName,
        lastName: account.profile.lastName,
        username: account.profile.username,
        email: account.email,
        photo: mediaUrl(account.userId, media.photo),
      }}
      badges={badges}
    >
      {children}
    </SeekerShell>
  );
}

/** The three numbers the bar prints, each allowed to fail on its own. */
async function readBadges(userId: string): Promise<SocialBadges> {
  const [messages, notifications, counts] = await Promise.all([
    unreadMessages(userId).catch(() => 0),
    unreadNotifications(userId).catch(() => 0),
    readNetworkCounts(userId).catch(() => null),
  ]);

  return {
    messages,
    notifications,
    invitations: counts?.incoming ?? 0,
  };
}
