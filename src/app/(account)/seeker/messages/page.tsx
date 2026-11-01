import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { readAccount } from "@/lib/account";
import { databaseConfigured } from "@/lib/db";
import { listConversations, readThread } from "@/lib/messages";
import type { Conversation, ConversationThread } from "@/lib/social-types";

import Messages from "../../../_account/seeker/Messages";

export const metadata: Metadata = { title: "Messaging" };

type Search = { searchParams: Promise<{ with?: string }> };

// The inbox, and one thread when the URL names a person.
//
// `?with=<id>` is the only address a conversation has, which is what lets
// a notification, a profile button and a copied link all land in the same
// place. A thread that cannot be read — an unknown id, a database that is
// down — costs the right column, not the list.
export default async function MessagesPage({ searchParams }: Search) {
  const account = await readAccount();
  if (!account) redirect("/sign-in");

  const { with: withId } = await searchParams;
  const online = databaseConfigured();

  const conversations: Conversation[] = online
    ? await listConversations(account.userId).catch(() => [])
    : [];

  let active: ConversationThread | null = null;

  if (online && withId) {
    active = await readThread(account.userId, withId).catch(() => null);
  }

  return (
    <Messages
      viewer={{
        id: account.userId,
        firstName: account.profile.firstName,
        lastName: account.profile.lastName,
        email: account.email,
        username: account.profile.username,
        headline: account.profile.headline,
      }}
      conversations={conversations}
      active={active}
      activeId={active?.person.id ?? null}
    />
  );
}
