// ------------------------------------------------------------------
//  People, as every social surface draws them.
//
//  Connections, the inbox, the bell and the mention picker all print the
//  same little card: a face, a name, a headline and a way to the profile.
//  That card is assembled here once, in one query for names, one for cities
//  and one for picture stamps, so a page with thirty rows is three round
//  trips instead of ninety.
//
//  The city is what gives a suggestion a reason ("Also in Indore"); the
//  mutual count is filled by the caller, because only the caller knows
//  which graph it is measuring against.
// ------------------------------------------------------------------

import "server-only";

import { sameOrigin } from "./account";
import { db, DatabaseError, ensureSchema } from "./db";
import { mediaUrl } from "./media-types";
import { readMediaStamps } from "./media";
import { isPersonId, readPeople } from "./people";
import type { PersonCard } from "./social-types";

/** An expected failure: a message and status a route can send as-is. */
export class SocialError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** A table id, checked before it is ever used as a parameter. */
export function readSocialId(value: unknown, message: string) {
  if (typeof value !== "string" || !isPersonId(value)) {
    throw new SocialError(message, 404);
  }

  return value;
}

/**
 * Same-origin check plus a JSON body. The social routes carry words, not
 * photographs, so the cap is much smaller than the feed's.
 */
export async function readSocialBody(request: Request, limit = 32_000) {
  sameOrigin(request);

  if (Number(request.headers.get("content-length")) > limit) {
    throw new SocialError("Request too large.", 413);
  }

  const raw = await request.text();
  if (raw.length > limit) throw new SocialError("Request too large.", 413);

  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error();
    return data as Record<string, unknown>;
  } catch {
    throw new SocialError("Invalid request.");
  }
}

/** Turn a thrown error into the JSON shape every social route returns. */
export function socialFailure(error: unknown) {
  if (error instanceof SocialError) {
    return Response.json(
      { error: error.message },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (error instanceof DatabaseError) {
    return Response.json(
      { error: "That is unavailable right now." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  console.error("Social request failed", error);

  return Response.json(
    { error: "Could not do that. Please try again." },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}

/** The name a person carries when neither table has ever heard of them. */
const UNKNOWN = "Recruit AI member";

/** Read a `?` list long enough for the ids that will use it. */
function marks(count: number) {
  return new Array(count).fill("?").join(", ");
}

/**
 * Person cards for a set of ids, in three queries at most.
 *
 * Ids that cannot exist are dropped before they reach SQL, and the result
 * map simply omits anyone the database has never seen — the caller decides
 * what to print instead of inheriting an invented person.
 */
export async function readPersonCards(
  ids: readonly string[],
): Promise<Map<string, PersonCard>> {
  const unique = [...new Set(ids.filter(isPersonId))].slice(0, 80);
  const cards = new Map<string, PersonCard>();

  if (!unique.length) return cards;

  await ensureSchema();

  const list = marks(unique.length);
  const connection = db();

  const [people, stored, media] = await Promise.all([
    readPeople(unique),
    connection
      .execute({
        sql: `SELECT user_id, city FROM site_profiles WHERE user_id IN (${list})`,
        args: unique,
      })
      .catch(() => null),
    readMediaStamps(unique).catch(() => new Map()),
  ]);

  const cities = new Map<string, string>();

  for (const row of stored?.rows ?? []) {
    cities.set(String(row.user_id), String(row.city ?? ""));
  }

  // Anyone the mirror has never seen was onboarded in the older app, whose
  // profile JSON still carries a city.
  const missing = unique.filter((id) => !cities.has(id));

  if (missing.length) {
    const legacy = await connection
      .execute({
        sql: `SELECT user_id, coalesce(json_extract(profile, '$.city'), '') AS city
              FROM seeker_profiles
              WHERE user_id IN (${marks(missing.length)})`,
        args: missing,
      })
      .catch(() => null);

    for (const row of legacy?.rows ?? []) {
      cities.set(String(row.user_id), String(row.city ?? ""));
    }
  }

  for (const id of unique) {
    const person = people.get(id);

    cards.set(id, {
      id,
      name: person?.name || UNKNOWN,
      username: person?.username ?? "",
      headline: person?.headline ?? "",
      photo: mediaUrl(id, media.get(id)?.photo ?? null),
      city: cities.get(id) ?? "",
      mutual: 0,
    });
  }

  return cards;
}

/** One person card, or a placeholder when the id is unknown. */
export async function readPersonCard(id: string): Promise<PersonCard> {
  return (
    (await readPersonCards([id])).get(id) ?? {
      id,
      name: UNKNOWN,
      username: "",
      headline: "",
      photo: null,
      city: "",
      mutual: 0,
    }
  );
}

/** The photograph and cover a profile hero needs, for one person. */
export async function readProfilePictures(userId: string) {
  const media = (await readMediaStamps([userId])).get(userId);

  return {
    photo: mediaUrl(userId, media?.photo ?? null),
    cover: mediaUrl(userId, media?.cover ?? null),
  };
}
