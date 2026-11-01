// ------------------------------------------------------------------
//  Who viewed your profile.
//
//  LinkedIn's most-read private number, built the quiet way: one row per
//  pair, rewritten when a visit happens. A log of every look would answer a
//  question nobody asks ("what did I look at on the 4th?") while making the
//  list page deduplicate faces on every read; a single row per pair answers
//  both things members actually want — who, and when — and keeps a `visits`
//  counter so a repeat reader still adds to the view total.
//
//  Two rules hold throughout:
//
//  · only the owner ever reads this. The names, faces and headlines belong
//    to the person standing in front of their own profile page, and there is
//    no route here that takes someone else's id;
//  · booking a view never breaks a page. A reader who came to look at a
//    profile has already got what they came for; the tally is bookkeeping, so
//    `recordProfileView` reports and swallows like the mirror writes in
//    `people.ts` do.
// ------------------------------------------------------------------

import "server-only";

import { db, ensureSchema } from "./db";
import { readPersonCards, readSocialId } from "./social";
import type { ProfileViewer, ProfileViewSummary } from "./social-types";

/** The longest viewer list any page asks for. `readPersonCards` caps at 80. */
const MAX_ROWS = 60;

/**
 * Book a visit: `viewerId` opened `ownerId`'s profile.
 *
 * Yourself is not a view, so a visit to your own profile — and there are many
 * while editing — leaves the table alone.
 */
export async function recordProfileView(
  viewerId: string,
  ownerId: string,
): Promise<void> {
  if (!viewerId || viewerId === ownerId) return;

  try {
    await ensureSchema();

    // A caller can pass a URL segment straight through, and a junk id would
    // write an unopenable row forever. This throws on anything that is not a
    // person id, which the catch below turns into a silently uncounted view.
    const personId = readSocialId(ownerId, "That profile could not be found.");
    const now = Date.now();

    // Bump first, insert only when the pair is new: one query for a returning
    // visitor, and the visit count survives the rewrite instead of resetting.
    const bumped = await db().execute({
      sql: `UPDATE site_profile_views SET created = ?, visits = visits + 1
            WHERE viewer_id = ? AND owner_id = ?`,
      args: [now, viewerId, personId],
    });

    if (!bumped.rowsAffected) {
      await db().execute({
        sql: `INSERT INTO site_profile_views (viewer_id, owner_id, created, visits)
              VALUES (?, ?, ?, 1)`,
        args: [viewerId, personId, now],
      });
    }
  } catch (error) {
    console.error("Could not record a profile view", error);
  }
}

/**
 * The owner's own viewers, newest visit first.
 *
 * The two reads go out together: the tally counts every visit while the rows
 * carry one line per person, and both come from the same index on
 * `(owner_id, created)` so the page is one seek plus a walk.
 *
 * A row whose id does not read as a person id at all is dropped rather than
 * printed as a face: an account that has been taken out should leave the list
 * instead of leaving a hole in it.
 */
export async function readProfileViews(
  viewerId: string,
  limit = MAX_ROWS,
): Promise<ProfileViewSummary> {
  await ensureSchema();

  const cap = Math.min(Math.max(Math.trunc(limit), 1), MAX_ROWS);

  const [tally, rows] = await Promise.all([
    db().execute({
      sql: `SELECT count(*) AS readers, coalesce(sum(visits), 0) AS views
            FROM site_profile_views
            WHERE owner_id = ? AND viewer_id <> ?`,
      args: [viewerId, viewerId],
    }),
    db().execute({
      sql: `SELECT viewer_id, created, visits
            FROM site_profile_views
            WHERE owner_id = ? AND viewer_id <> ?
            ORDER BY created DESC, viewer_id ASC
            LIMIT ?`,
      args: [viewerId, viewerId, cap],
    }),
  ]);

  const cards = await readPersonCards(rows.rows.map((row) => String(row.viewer_id)));

  const people: ProfileViewer[] = [];

  for (const row of rows.rows) {
    const person = cards.get(String(row.viewer_id));
    if (!person) continue;

    people.push({
      person,
      seen: Number(row.created),
      visits: Number(row.visits ?? 1),
    });
  }

  const head = tally.rows[0];

  return {
    views: Number(head?.views ?? 0),
    readers: Number(head?.readers ?? 0),
    people,
  };
}

/** The two numbers alone, for a rail that has no room for faces. */
export async function readProfileViewCount(
  viewerId: string,
): Promise<{ views: number; readers: number }> {
  await ensureSchema();

  const result = await db().execute({
    sql: `SELECT count(*) AS readers, coalesce(sum(visits), 0) AS views
          FROM site_profile_views
          WHERE owner_id = ? AND viewer_id <> ?`,
    args: [viewerId, viewerId],
  });

  const row = result.rows[0];

  return {
    views: Number(row?.views ?? 0),
    readers: Number(row?.readers ?? 0),
  };
}
