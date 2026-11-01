// ------------------------------------------------------------------
//  A post photo, pushed to object storage.
//
//  The composer re-encodes a pick into a data URL. Storing that whole
//  string in a Turso row means every feed read hauls hundreds of
//  kilobytes of base64 through React, so at write time the bytes are
//  uploaded to Vercel Blob and only the short public https URL is kept in
//  `site_posts.image`.
//
//  This is the post path alone. Profile pictures live in `site_media`,
//  which belongs to the older workspace and is served as its own bytes —
//  nothing here touches it.
// ------------------------------------------------------------------

import "server-only";

import { del, put } from "@vercel/blob";

import { FeedError } from "./feed";

/** The data URL the composer produces, captured for its extension and type. */
const POST_IMAGE = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/;

const EXTENSION: Record<string, string> = {
  png: ".png",
  jpeg: ".jpg",
  webp: ".webp",
};

/**
 * Upload an inline image and return its public URL.
 *
 * A blob that cannot be written is a failed post, not a reason to fall back
 * to the giant base64 row this module exists to avoid, so the failure
 * travels back to the route as a normal feed error.
 */
export async function storePostImage(
  dataUrl: string,
  postId: string,
): Promise<string> {
  const match = POST_IMAGE.exec(dataUrl);
  if (!match) throw new FeedError("That photo could not be attached.");

  const [, subtype, base64] = match;
  const bytes = Buffer.from(base64, "base64");
  if (!bytes.length) throw new FeedError("That photo could not be attached.");

  try {
    const blob = await put(`posts/${postId}${EXTENSION[subtype] ?? ".img"}`, bytes, {
      access: "public",
      contentType: `image/${subtype}`,
    });
    return blob.url;
  } catch (error) {
    console.error("Could not store a post photo", error);
    throw new FeedError("That photo could not be attached. Try again.", 502);
  }
}

/** The host Vercel Blob serves from — only these URLs are ours to delete. */
const BLOB_HOST = /\.blob\.vercel-storage\.com$/i;

function isBlobUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    return BLOB_HOST.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

/**
 * Best-effort removal of a stored photo. It never throws: a blob that cannot
 * be reached must not undo the row delete its caller already made, and a
 * user-supplied external link is never touched.
 */
export async function dropPostImage(
  url: string | null | undefined,
): Promise<void> {
  if (!isBlobUrl(url)) return;
  try {
    await del(url);
  } catch (error) {
    console.error("Could not remove a stored post photo", error);
  }
}
