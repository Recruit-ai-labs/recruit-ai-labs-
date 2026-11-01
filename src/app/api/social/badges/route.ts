// The three numbers the bar prints.
//
// GET /api/social/badges → { messages, notifications, invitations }
//
// Cheap enough to poll: three counts, no person cards, no list. The shell
// asks every twenty seconds so a message or an invitation shows up while
// the reader is still reading the feed.

import { readAccount } from "@/lib/account";
import { unreadMessages } from "@/lib/messages";
import { readNetworkCounts } from "@/lib/network";
import { unreadNotifications } from "@/lib/notifications";
import { SocialError, socialFailure } from "@/lib/social";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const account = await readAccount();
    if (!account) throw new SocialError("Sign in to see your network.", 401);

    const [messages, notifications, counts] = await Promise.all([
      unreadMessages(account.userId),
      unreadNotifications(account.userId),
      readNetworkCounts(account.userId),
    ]);

    return Response.json(
      { messages, notifications, invitations: counts.incoming },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return socialFailure(error);
  }
}
