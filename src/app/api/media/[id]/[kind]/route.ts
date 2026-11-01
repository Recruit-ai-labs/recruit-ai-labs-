// A profile picture, served as bytes rather than as a data URL.
//
// The address carries the row's `updated` stamp in `?v=`, so a stored
// photograph never changes behind a URL: the response can be cached for a
// year, and a new upload lands on a new address. Serving the decoded
// bytes independently also means a page render hands the browser a short
// URL instead of a few hundred kilobytes of base64 inside the HTML.

import { readMediaImage } from "@/lib/media";
import { isMediaKind } from "@/lib/media-types";

const ID = /^[A-Za-z0-9_-]{1,64}$/;

const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/;

function missing() {
  return new Response("No such picture.", {
    status: 404,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; kind: string }> },
) {
  const { id, kind } = await params;

  if (!ID.test(id) || !isMediaKind(kind)) return missing();

  try {
    const data = await readMediaImage(id, kind);
    if (!data) return missing();

    const match = DATA_URL.exec(data);
    if (!match) return missing();

    const [, type, base64] = match;
    const bytes = Buffer.from(base64, "base64");
    if (!bytes.length) return missing();

    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": type,
        "Content-Length": String(bytes.length),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    // A database that cannot answer is not a broken page: the profile
    // falls back to its drawn cover and initials.
    console.error("Could not read a profile picture", error);
    return missing();
  }
}
