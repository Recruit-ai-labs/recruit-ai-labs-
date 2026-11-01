// The whole comment thread under one post.
//
// The card ships with the two newest comments so it never looks empty;
// this is what "View all" asks for.

import { readAccount } from "@/lib/account";
import {
  FeedError,
  feedFailure,
  readComments,
  viewerOf,
} from "@/lib/feed";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const account = await readAccount();
    if (!account) throw new FeedError("Sign in to read comments.", 401);

    const { id } = await params;
    const comments = await readComments(viewerOf(account), id);

    return Response.json({ comments }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return feedFailure(error);
  }
}
