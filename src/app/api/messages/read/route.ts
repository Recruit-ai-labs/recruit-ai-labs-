// Mark a thread read.
//
// POST /api/messages/read  { with: "<person id>" }
//
// Called when a thread is opened and when a new bubble arrives while it is
// still open. The answer is the reader's remaining unread count, so the
// bar's badge drops in the same beat.

import { readAccount } from "@/lib/account";
import { markThreadRead } from "@/lib/messages";
import { SocialError, readSocialBody, socialFailure } from "@/lib/social";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const account = await readAccount();
    if (!account) throw new SocialError("Sign in to read your messages.", 401);

    const body = await readSocialBody(request);
    const other = body.with;

    if (typeof other !== "string" || !other) {
      throw new SocialError("That conversation could not be found.", 404);
    }

    const result = await markThreadRead(account.userId, other);

    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return socialFailure(error);
  }
}
