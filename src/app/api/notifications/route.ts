// The bell.
//
// GET  /api/notifications          → the list plus the unread count
// POST /api/notifications  { id? } → clear one row, or all of them
//
// The list is small (forty rows) and already phrased by the server, so the
// page prints it as it arrives.

import { readAccount } from "@/lib/account";
import {
  listNotifications,
  markNotificationsRead,
  unreadNotifications,
} from "@/lib/notifications";
import { SocialError, readSocialBody, socialFailure } from "@/lib/social";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const account = await readAccount();
    if (!account) throw new SocialError("Sign in to see your notifications.", 401);

    const [notifications, unread] = await Promise.all([
      listNotifications(account.userId),
      unreadNotifications(account.userId),
    ]);

    return Response.json(
      { notifications, unread },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return socialFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const account = await readAccount();
    if (!account) throw new SocialError("Sign in to clear your notifications.", 401);

    const body = await readSocialBody(request);
    const id = typeof body.id === "string" && body.id ? body.id : undefined;

    const result = await markNotificationsRead(account.userId, id);

    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return socialFailure(error);
  }
}
