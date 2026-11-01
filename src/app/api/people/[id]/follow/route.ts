// Follow or unfollow one person.
//
// POST /api/people/[id]/follow  { follow: boolean }
//
// A follow is what turns "For you" into "Following" and what lets a post
// marked Followers reach the people who asked for it.

import { readAccount } from "@/lib/account";
import { FeedError, feedFailure, readFeedBody, setFollow } from "@/lib/feed";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const account = await readAccount();
    if (!account) throw new FeedError("Sign in to follow someone.", 401);

    const { id } = await params;
    const body = await readFeedBody(request);

    const result = await setFollow(account.userId, id, body.follow === true);

    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return feedFailure(error);
  }
}
