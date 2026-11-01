import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { readAccount } from "@/lib/account";
import { databaseConfigured } from "@/lib/db";
import { listNotifications, unreadNotifications } from "@/lib/notifications";
import type { SocialNotification } from "@/lib/social-types";

import Notifications from "../../../_account/seeker/Notifications";

export const metadata: Metadata = { title: "Notifications" };

// The bell's page. Forty rows is the whole list — a notification that is
// older than that has been read, and a history nobody scrolls is not a
// feature. The unread count is read beside the list so the header and the
// bar cannot disagree.
export default async function NotificationsPage() {
  const account = await readAccount();
  if (!account) redirect("/sign-in");

  const online = databaseConfigured();

  const [notifications, unread] = online
    ? await Promise.all([
        listNotifications(account.userId).catch(() => [] as SocialNotification[]),
        unreadNotifications(account.userId).catch(() => 0),
      ])
    : [[] as SocialNotification[], 0];

  return <Notifications initial={notifications} initialUnread={unread} />;
}
