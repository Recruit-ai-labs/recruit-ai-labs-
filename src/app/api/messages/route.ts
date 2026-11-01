// Messages — the inbox, one thread, and the send.
//
// GET  /api/messages            → every conversation, newest first
// GET  /api/messages?with=<id>  → that thread, oldest first
// POST /api/messages  { to, body }
//
// The thread is addressed by the other person's id rather than by a
// conversation id, which is also how a notification links into it.

import { readAccount } from "@/lib/account";
import { viewerOf } from "@/lib/feed";
import {
  listConversations,
  readThread,
  sendMessage,
  unreadMessages,
} from "@/lib/messages";
import { SocialError, readSocialBody, socialFailure } from "@/lib/social";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const account = await readAccount();
    if (!account) throw new SocialError("Sign in to read your messages.", 401);

    const url = new URL(request.url);
    const withId = url.searchParams.get("with");

    if (withId) {
      const thread = await readThread(account.userId, withId);
      return Response.json(thread, { headers: { "Cache-Control": "no-store" } });
    }

    const [conversations, unread] = await Promise.all([
      listConversations(account.userId),
      unreadMessages(account.userId),
    ]);

    return Response.json(
      { conversations, unread },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return socialFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const account = await readAccount();
    if (!account) throw new SocialError("Sign in to send a message.", 401);

    const body = await readSocialBody(request);
    const to = body.to;

    if (typeof to !== "string" || !to) {
      throw new SocialError("Choose who to message first.");
    }

    const viewer = viewerOf(account);
    const result = await sendMessage(viewer, to, body.body);

    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return socialFailure(error);
  }
}
