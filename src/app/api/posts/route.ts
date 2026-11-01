// Write a post.
//
// POST /api/posts  { body, image, audience }
//
// The response is the finished card, not an id: the browser puts it at the
// top of the feed without a second read.

import { readAccount } from "@/lib/account";
import {
  createPost,
  feedFailure,
  FeedError,
  readFeedBody,
  viewerOf,
} from "@/lib/feed";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const account = await readAccount();
    if (!account) throw new FeedError("Sign in to post.", 401);

    const body = await readFeedBody(request);
    const post = await createPost(viewerOf(account), body);

    return Response.json({ post }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return feedFailure(error);
  }
}
