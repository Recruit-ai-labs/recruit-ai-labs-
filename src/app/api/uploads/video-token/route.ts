// Mint a short-lived Vercel Blob client token for one clip upload.
//
// POST /api/uploads/video-token  { ext: "mp4" | "webm" }
//   -> { token, pathname }
//
// The composer asks here, then streams the file straight to Blob with the
// returned token — the bytes never pass through a function, which is the
// only reason a clip can be far larger than a post photo. The token is
// scoped to a single pathname under `posts/videos/`, to video content
// types, to the size budget, and to a quarter of an hour, so a leaked one
// is worth almost nothing.
//
// Requires BLOB_READ_WRITE_TOKEN (set on the deploy; empty locally, where
// the route answers with a clear 503 rather than a stack trace).

import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";

import { readAccount } from "@/lib/account";
import { MAX_VIDEO_BYTES, VIDEO_TYPES } from "@/lib/feed-types";

export const dynamic = "force-dynamic";

const EXTERNAL: Record<string, string> = {
  mp4: ".mp4",
  webm: ".webm",
};

export async function POST(request: Request) {
  const account = await readAccount();
  if (!account) {
    return Response.json({ error: "Sign in to upload a video." }, { status: 401 });
  }

  let ext = "mp4";
  try {
    const body = (await request.json()) as { ext?: unknown };
    if (typeof body.ext === "string" && body.ext in EXTERNAL) ext = body.ext;
  } catch {
    // A body we cannot read still gets the default container; the token
    // itself is what the client needs, and it constrains the type anyway.
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json(
      { error: "Video uploads are not configured on this deployment." },
      { status: 503 },
    );
  }

  const pathname = `posts/videos/${crypto.randomUUID()}${EXTERNAL[ext]}`;

  try {
    const token = await generateClientTokenFromReadWriteToken({
      pathname,
      allowedContentTypes: [...VIDEO_TYPES],
      maximumSizeInBytes: MAX_VIDEO_BYTES,
      addRandomSuffix: true,
      validUntil: Date.now() + 15 * 60 * 1000,
    });

    return Response.json(
      { token, pathname },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Could not issue a video upload token", error);
    return Response.json(
      { error: "Could not start a video upload. Try again." },
      { status: 502 },
    );
  }
}
