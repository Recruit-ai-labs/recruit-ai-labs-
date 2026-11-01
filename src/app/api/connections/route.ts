// The connection graph, one action at a time.
//
// POST /api/connections  { personId, action, note? }
//   action: invite | accept | decline | withdraw | remove
//
// `note` rides only on `invite`: a short line the sender adds to a brand-new
// invitation, delivered inside the recipient's bell.
//
// Every action answers with the reader's standing with that person and the
// five counters the network page and the bar print, so the browser can
// redraw both without asking again.

import { readAccount } from "@/lib/account";
import {
  inviteToConnect,
  readNetworkCounts,
  removeConnection,
  respondToInvitation,
  SocialError,
  withdrawInvitation,
} from "@/lib/network";
import { readSocialBody, socialFailure } from "@/lib/social";

export const dynamic = "force-dynamic";

const ACTIONS = ["invite", "accept", "decline", "withdraw", "remove"] as const;

type Action = (typeof ACTIONS)[number];

function readAction(value: unknown): Action {
  if (typeof value !== "string" || !ACTIONS.includes(value as Action)) {
    throw new SocialError("Check what you asked for and try again.");
  }

  return value as Action;
}

export async function POST(request: Request) {
  try {
    const account = await readAccount();
    if (!account) throw new SocialError("Sign in to connect with people.", 401);

    const body = await readSocialBody(request);
    const personId = body.personId;
    const action = readAction(body.action);

    if (typeof personId !== "string" || !personId) {
      throw new SocialError("That person could not be found.", 404);
    }

    switch (action) {
      case "invite":
        return Response.json(
          await inviteToConnect(account.userId, personId, body.note),
          { headers: { "Cache-Control": "no-store" } },
        );
      case "accept":
        return Response.json(
          await respondToInvitation(account.userId, personId, true),
          { headers: { "Cache-Control": "no-store" } },
        );
      case "decline":
        return Response.json(
          await respondToInvitation(account.userId, personId, false),
          { headers: { "Cache-Control": "no-store" } },
        );
      case "withdraw":
        return Response.json(await withdrawInvitation(account.userId, personId), {
          headers: { "Cache-Control": "no-store" },
        });
      default:
        return Response.json(await removeConnection(account.userId, personId), {
          headers: { "Cache-Control": "no-store" },
        });
    }
  } catch (error) {
    return socialFailure(error);
  }
}

/** The counters alone, for a bar that only needs to know what changed. */
export async function GET() {
  try {
    const account = await readAccount();
    if (!account) throw new SocialError("Sign in to see your network.", 401);

    return Response.json(
      { counts: await readNetworkCounts(account.userId) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return socialFailure(error);
  }
}
