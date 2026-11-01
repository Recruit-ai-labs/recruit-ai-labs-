// ------------------------------------------------------------------
//  Profile pictures, server side.
//
//  `site_media` belongs to the older workspace at D:\New folder and is
//  used exactly as it was found: a row per person and kind, `kind` being
//  "cover" or "photo", `data` holding a whole data URL. The shape was
//  read from the live database before this file was written.
//
//  There is no key on that table, so a save is a delete followed by an
//  insert in one batch — two statements that cannot leave a person with
//  half a photograph. The profile page only ever reads the `updated`
//  stamp (that is the cache key in the image URL); the bytes themselves
//  are read by the image route alone, so a page render never hauls a
//  megabyte of base64 through React.
// ------------------------------------------------------------------

import "server-only";

import { cache } from "react";

import { db, ensureSchema } from "./db";
import {
  isMediaKind,
  type MediaEntry,
  type MediaKind,
  type ProfileMedia,
} from "./media-types";

/** A whole image data URL, the only thing this table is allowed to hold. */
const DATA_URL = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=\s]+$/;

export function isImageData(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 64 &&
    DATA_URL.test(value)
  );
}

/**
 * Which kinds this person has, with the stamp each one was saved at.
 *
 * Wrapped in `cache` because the seeker layout and the page inside it both
 * need the same two stamps to address a portrait: without it every
 * navigation asks the database twice for one answer.
 */
export const readMedia = cache(async (userId: string): Promise<ProfileMedia> => {
  await ensureSchema();

  const result = await db().execute({
    sql: "SELECT kind, updated FROM site_media WHERE user_id = ?",
    args: [userId],
  });

  const media: ProfileMedia = { photo: null, cover: null };

  for (const row of result.rows) {
    const kind = row.kind;
    if (!isMediaKind(kind)) continue;

    const updated = Number(row.updated);
    if (!Number.isFinite(updated)) continue;

    // The table carries no uniqueness, so the newest row of a kind wins —
    // a leftover duplicate can never shadow the photograph just uploaded.
    const seen = media[kind];
    if (!seen || seen.updated < updated) media[kind] = { kind, updated };
  }

  return media;
});

/**
 * The stamps for a set of people, in one query.
 *
 * A network page draws thirty people at once; asking `readMedia` once per
 * row would be thirty round trips over a remote database. Missing ids are
 * simply absent from the map, and the caller falls back to initials.
 */
export async function readMediaStamps(
  userIds: readonly string[],
): Promise<Map<string, ProfileMedia>> {
  const unique = [...new Set(userIds)].slice(0, 80);
  const stamps = new Map<string, ProfileMedia>();

  if (!unique.length) return stamps;

  await ensureSchema();

  const result = await db().execute({
    sql: `SELECT user_id, kind, max(updated) AS updated
          FROM site_media
          WHERE user_id IN (${unique.map(() => "?").join(", ")})
          GROUP BY user_id, kind`,
    args: unique,
  });

  for (const row of result.rows) {
    const id = String(row.user_id);
    const kind = row.kind;
    if (!isMediaKind(kind)) continue;

    const updated = Number(row.updated);
    if (!Number.isFinite(updated)) continue;

    const media = stamps.get(id) ?? { photo: null, cover: null };
    media[kind] = { kind, updated };
    stamps.set(id, media);
  }

  return stamps;
}

/** The stored data URL itself, for the route that serves the bytes. */
export async function readMediaImage(userId: string, kind: MediaKind) {
  await ensureSchema();

  const result = await db().execute({
    sql: "SELECT data FROM site_media WHERE user_id = ? AND kind = ? ORDER BY updated DESC LIMIT 1",
    args: [userId, kind],
  });

  const data = result.rows[0]?.data;
  return typeof data === "string" && data.startsWith("data:") ? data : null;
}

/** Replace whatever kind holds, and report the stamp it was written at. */
export async function saveMedia(
  userId: string,
  kind: MediaKind,
  data: string,
): Promise<MediaEntry> {
  await ensureSchema();

  const updated = Date.now();

  await db().batch([
    {
      sql: "DELETE FROM site_media WHERE user_id = ? AND kind = ?",
      args: [userId, kind],
    },
    {
      sql: "INSERT INTO site_media (user_id, kind, data, updated) VALUES (?, ?, ?, ?)",
      args: [userId, kind, data, updated],
    },
  ]);

  return { kind, updated };
}

/** Take a picture down; the page falls back to the drawn cover or initials. */
export async function clearMedia(userId: string, kind: MediaKind) {
  await ensureSchema();

  await db().execute({
    sql: "DELETE FROM site_media WHERE user_id = ? AND kind = ?",
    args: [userId, kind],
  });
}
