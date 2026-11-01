// ------------------------------------------------------------------
//  People — the name beside a post.
//
//  A feed cannot ask Clerk who forty authors are; that is forty API calls
//  per render. So the short version of a profile (name, username,
//  headline) is written to `site_people` whenever a profile is saved, and
//  a feed reads names in one query.
//
//  Two writers fill this table, which is why reads fall back: this
//  workspace writes `site_people`, and the older app writes
//  `seeker_profiles`. Someone who only ever used the older app has no
//  `site_people` row but is still a person in the feed, so a miss is looked
//  up in `seeker_profiles` before it is called unknown.
//
//  Nothing here throws, reports or is awaited by the UI. It runs behind the
//  save that already happened.
// ------------------------------------------------------------------

import "server-only";

import { db, ensureSchema } from "./db";
import type { SeekerProfile } from "./seeker-profile";

export type Person = {
  id: string;
  name: string;
  username: string;
  headline: string;
};

/** "First Last", trimmed — the one place that decides how a name prints. */
export function personName(profile: {
  firstName: string;
  lastName: string;
}): string {
  return `${profile.firstName} ${profile.lastName}`.trim();
}

/** Clerk ids are opaque but never punctuation; this keeps SQL args honest. */
export function isPersonId(value: string) {
  return /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

/**
 * Write (or refresh) the mirror row for one profile.
 *
 * Called after the profile is saved. A stale name is worse than a missing
 * one — someone reading a feed should see the name the person chose today —
 * so this is an upsert, not an insert.
 */
export async function rememberPerson(
  userId: string,
  profile: SeekerProfile,
): Promise<void> {
  if (!isPersonId(userId)) return;

  await ensureSchema();

  const now = Date.now();

  // Two mirrors, one write. `site_people` is the name beside a post;
  // `site_profiles` is what the public profile page prints for someone who
  // is not the reader. They are batched so a name can never be newer than
  // the profile it belongs to.
  await db().batch([
    {
      sql: `INSERT INTO site_people (user_id, name, username, headline, updated)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
              name = excluded.name,
              username = excluded.username,
              headline = excluded.headline,
              updated = excluded.updated`,
      args: [
        userId,
        personName(profile),
        profile.username,
        profile.headline,
        now,
      ],
    },
    {
      sql: `INSERT INTO site_profiles (user_id, city, country, profile, updated)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
              city = excluded.city,
              country = excluded.country,
              profile = excluded.profile,
              updated = excluded.updated`,
      args: [
        userId,
        profile.city,
        profile.country,
        JSON.stringify(profile),
        now,
      ],
    },
  ]);
}

/**
 * Names for a set of authors, in at most two round trips.
 *
 * The cap is deliberate: a feed page asks for the authors it is about to
 * draw, never for "everyone". Unknown ids are simply absent from the map,
 * and the caller decides what to print instead.
 */
export async function readPeople(
  ids: readonly string[],
): Promise<Map<string, Person>> {
  const unique = [...new Set(ids.filter(isPersonId))].slice(0, 60);
  const people = new Map<string, Person>();

  if (!unique.length) return people;

  await ensureSchema();

  const marks = unique.map(() => "?").join(", ");
  const connection = db();

  const mirrored = await connection.execute({
    sql: `SELECT user_id, name, username, headline
          FROM site_people
          WHERE user_id IN (${marks})`,
    args: unique,
  });

  for (const row of mirrored.rows) {
    const id = String(row.user_id);
    people.set(id, {
      id,
      name: String(row.name),
      username: String(row.username ?? ""),
      headline: String(row.headline ?? ""),
    });
  }

  // Whoever the mirror has never seen was onboarded in the older app.
  const missing = unique.filter((id) => !people.has(id));
  if (!missing.length) return people;

  const legacyMarks = missing.map(() => "?").join(", ");
  const stored = await connection.execute({
    sql: `SELECT user_id,
                 trim(
                   coalesce(json_extract(profile, '$.firstName'), '') || ' ' ||
                   coalesce(json_extract(profile, '$.lastName'), '')
                 ) AS name,
                 coalesce(json_extract(profile, '$.username'), '') AS username,
                 coalesce(json_extract(profile, '$.headline'), '') AS headline
          FROM seeker_profiles
          WHERE user_id IN (${legacyMarks})`,
    args: missing,
  });

  for (const row of stored.rows) {
    const id = String(row.user_id);
    people.set(id, {
      id,
      name: String(row.name ?? ""),
      username: String(row.username ?? ""),
      headline: String(row.headline ?? ""),
    });
  }

  return people;
}

/** One person, or null when nothing on either side knows them. */
export async function readPerson(id: string): Promise<Person | null> {
  const people = await readPeople([id]);
  return people.get(id) ?? null;
}
