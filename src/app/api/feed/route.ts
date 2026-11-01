// The feed, one page at a time.
//
// GET /api/feed?filter=for-you|following|saved&limit=12&before=<ms>
//
// The browser polls this endpoint to keep the feed live, so the answer is
// never cached and always shaped as a whole page — the client merges it
// rather than guessing what changed.

import { readAccount } from "@/lib/account";
import {
  feedFailure,
  FeedError,
  readFeed,
  viewerOf,
} from "@/lib/feed";
import type { FeedFilter } from "@/lib/feed-types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const account = await readAccount();
    if (!account) throw new FeedError("Sign in to see your feed.", 401);

    const url = new URL(request.url);
    // Every filter the tabs can ask for is passed through by name. A
    // ternary that only knew `following` used to send `saved` quietly
    // asking for the For-you list, so the Saved tab showed strangers.
    const wanted = url.searchParams.get("filter");
    const filter: FeedFilter =
      wanted === "following" || wanted === "saved" ? wanted : "for-you";
    const before = Number(url.searchParams.get("before"));

    const page = await readFeed(viewerOf(account), {
      filter,
      before: Number.isFinite(before) && before > 0 ? before : undefined,
      limit: Number(url.searchParams.get("limit")) || 12,
    });

    return Response.json(page, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return feedFailure(error);
  }
}
