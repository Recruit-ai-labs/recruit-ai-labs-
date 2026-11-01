// One post and everything that can happen to it.
//
//   GET    /api/posts/[id]            the card, for a permalink
//   POST   /api/posts/[id]            { action: ... } — see below
//   DELETE /api/posts/[id]            soft-delete your own post
//
// Actions: react | like | unlike | save | unsave | comment | comment-delete |
// repost | edit | delete. Each returns only the numbers the card has to
// change, so an optimistic UI can be reconciled with the truth in one
// assignment. `edit` is the exception: the words themselves changed, so the
// whole refreshed post comes back and the card replaces its own copy.
//
// `react` carries a `kind` — one of the five, or null to take the reaction
// back. `like`/`unlike` stay as the plain taps they always were, so a client
// that has not been updated cannot lose a reaction it never had.

import { readAccount } from "@/lib/account";
import {
  addComment,
  deleteComment,
  deletePost,
  editPost,
  FeedError,
  feedFailure,
  readFeedBody,
  readPost,
  repost,
  setReaction,
  setSaved,
  viewerOf,
} from "@/lib/feed";
import { isReactionKind } from "@/lib/feed-types";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(_request: Request, { params }: Context) {
  try {
    const account = await readAccount();
    if (!account) throw new FeedError("Sign in to read a post.", 401);

    const { id } = await params;
    const viewer = viewerOf(account);

    const post = await readPost(viewer, id);
    if (!post) throw new FeedError("That post is no longer there.", 404);

    return Response.json({ post }, { headers: NO_STORE });
  } catch (error) {
    return feedFailure(error);
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const account = await readAccount();
    if (!account) throw new FeedError("Sign in to do that.", 401);

    const { id } = await params;
    const viewer = viewerOf(account);
    const body = await readFeedBody(request);

    switch (body.action) {
      case "react": {
        // A body straight off the wire can claim anything: an unknown word
        // is refused rather than written into the kind column forever. An
        // omitted or explicit null is the reader taking the reaction back.
        if (body.kind === null || body.kind === undefined) {
          const cleared = await setReaction(viewer.id, id, null);
          return Response.json(cleared, { headers: NO_STORE });
        }

        if (!isReactionKind(body.kind)) {
          throw new FeedError("That is not one of the reactions.");
        }

        const result = await setReaction(viewer.id, id, body.kind);
        return Response.json(result, { headers: NO_STORE });
      }

      case "like": {
        const result = await setReaction(viewer.id, id, "like");
        return Response.json(result, { headers: NO_STORE });
      }

      case "unlike": {
        const result = await setReaction(viewer.id, id, null);
        return Response.json(result, { headers: NO_STORE });
      }

      case "save":
      case "unsave": {
        const result = await setSaved(viewer.id, id, body.action === "save");
        return Response.json(result, { headers: NO_STORE });
      }

      case "comment": {
        const result = await addComment(viewer, id, body.body);
        return Response.json(result, { headers: NO_STORE });
      }

      case "comment-delete": {
        const result = await deleteComment(viewer.id, String(body.commentId ?? ""));
        return Response.json(result, { headers: NO_STORE });
      }

      case "repost": {
        const result = await repost(viewer, id, body.body);
        return Response.json(result, { headers: NO_STORE });
      }

      case "edit": {
        // The card cannot build the new state itself — the server re-reads
        // the row so the "Edited" stamp and the refreshed mentions arrive
        // exactly as every other reader will see them.
        const post = await editPost(viewer, id, body.body);
        return Response.json({ post }, { headers: NO_STORE });
      }

      case "delete": {
        const result = await deletePost(viewer.id, id);
        return Response.json(result, { headers: NO_STORE });
      }

      default:
        throw new FeedError("That action is not supported.");
    }
  } catch (error) {
    return feedFailure(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const account = await readAccount();
    if (!account) throw new FeedError("Sign in to do that.", 401);

    const { id } = await params;
    const result = await deletePost(account.userId, id);

    return Response.json(result, { headers: NO_STORE });
  } catch (error) {
    return feedFailure(error);
  }
}
