// People search.
//
// GET /api/people?q=<words>&limit=8
//
// The composer's mention list and the inbox's "new message" sheet both
// read this. An empty query is not an error: it returns the people the
// reader is most likely to want next.

import { readAccount } from "@/lib/account";
import { searchPeople, SocialError } from "@/lib/network";
import { socialFailure } from "@/lib/social";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const account = await readAccount();
    if (!account) throw new SocialError("Sign in to search for people.", 401);

    const url = new URL(request.url);
    const query = (url.searchParams.get("q") ?? "").slice(0, 60);
    const limit = Number(url.searchParams.get("limit")) || 8;

    const people = await searchPeople(account.userId, query, limit);

    return Response.json({ people }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return socialFailure(error);
  }
}
