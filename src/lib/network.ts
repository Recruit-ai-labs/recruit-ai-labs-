// ------------------------------------------------------------------
//  The connection graph — invitations, connections, and the second degree.
//
//  One row per pair in `site_connections`, whichever way it points. The
//  public functions here are the only place that writes it, so the four
//  states the UI knows (none / outgoing / incoming / connected) are always
//  derived from the same truth rather than tracked in four screens.
//
//  The suggestions query is the one worth reading twice: it rebuilds the
//  graph as a symmetric edge list, walks two steps out from the reader, and
//  counts how many of their own connections each candidate shares. That is
//  "connections of connections", ordered by how many, which is the order
//  LinkedIn uses and the order people trust.
//
//  The profile page is here too, because it is the graph's other face: how
//  the reader stands with one person decides whether the profile opens or
//  stays behind the connect/follow gate.
// ------------------------------------------------------------------

import "server-only";

import { db, ensureSchema } from "./db";
import { notify } from "./notifications";
import { readPerson } from "./people";
import {
  readPersonCards,
  readProfilePictures,
  readSocialId,
  SocialError,
} from "./social";
import { MAX_INVITE_NOTE } from "./social-types";
import type {
  ConnectionState,
  NetworkCounts,
  NetworkOverview,
  PersonCard,
  PublicEducation,
  PublicExperience,
  PublicProfile,
  PublicSkill,
} from "./social-types";

export { SocialError } from "./social";

// ------------------------------------------------------------------
//  Reading the graph
// ------------------------------------------------------------------

/** Where the reader stands with one person. */
export async function readConnectionState(
  viewerId: string,
  personId: string,
): Promise<ConnectionState> {
  if (viewerId === personId) return "self";

  const result = await db().execute({
    sql: `SELECT requester_id, status FROM site_connections
          WHERE (requester_id = ? AND addressee_id = ?)
             OR (requester_id = ? AND addressee_id = ?)
          LIMIT 1`,
    args: [viewerId, personId, personId, viewerId],
  });

  const row = result.rows[0];
  if (!row) return "none";
  if (String(row.status) === "accepted") return "connected";

  return String(row.requester_id) === viewerId ? "outgoing" : "incoming";
}

/** The five numbers the network page and the home rail print. */
export async function readNetworkCounts(viewerId: string): Promise<NetworkCounts> {
  await ensureSchema();

  const result = await db().execute({
    sql: `SELECT
            (SELECT count(*) FROM site_connections
              WHERE status = 'accepted'
                AND (requester_id = ? OR addressee_id = ?)) AS connections,
            (SELECT count(*) FROM site_connections
              WHERE status = 'pending' AND addressee_id = ?) AS incoming,
            (SELECT count(*) FROM site_connections
              WHERE status = 'pending' AND requester_id = ?) AS outgoing,
            (SELECT count(*) FROM site_follows WHERE followee_id = ?) AS followers,
            (SELECT count(*) FROM site_follows WHERE follower_id = ?) AS following`,
    args: [viewerId, viewerId, viewerId, viewerId, viewerId, viewerId],
  });

  const row = result.rows[0];

  return {
    connections: Number(row?.connections ?? 0),
    incoming: Number(row?.incoming ?? 0),
    outgoing: Number(row?.outgoing ?? 0),
    followers: Number(row?.followers ?? 0),
    following: Number(row?.following ?? 0),
  };
}

/**
 * Everyone this database knows about, as `named (id, name, username)`.
 *
 * Two writers fill the roster: this workspace mirrors names into
 * `site_people` whenever a profile is saved (see people.ts), and the older
 * app keeps its own rows in `seeker_profiles`. Someone who only ever used
 * the older app therefore has no mirror row but is still a person worth
 * suggesting — so both tables are read, the mirror wins a name clash, and a
 * row whose name is still blank is left out rather than drawn as a ghost.
 */
const MEMBERS = `members AS (
    SELECT user_id AS id, name, username FROM site_people
    UNION ALL
    SELECT user_id,
           trim(
             coalesce(json_extract(profile, '$.firstName'), '') || ' ' ||
             coalesce(json_extract(profile, '$.lastName'), '')
           ) AS name,
           coalesce(json_extract(profile, '$.username'), '') AS username
      FROM seeker_profiles
     WHERE user_id NOT IN (SELECT user_id FROM site_people)
  ),
  named AS (
    SELECT id, max(name) AS name, max(username) AS username
      FROM members
     WHERE trim(name) <> ''
     GROUP BY id
  )`;

/**
 * People the reader could know, with how many of their connections they
 * already share. Best first, never someone already connected or invited.
 */
export async function readNetworkSuggestions(
  viewerId: string,
  limit = 6,
): Promise<PersonCard[]> {
  await ensureSchema();

  const result = await db().execute({
    sql: `WITH ${MEMBERS},
          edges AS (
            SELECT requester_id AS a, addressee_id AS b
              FROM site_connections WHERE status = 'accepted'
            UNION ALL
            SELECT addressee_id AS a, requester_id AS b
              FROM site_connections WHERE status = 'accepted'
          ),
          mine AS (SELECT b AS id FROM edges WHERE a = ?),
          second AS (
            SELECT e2.b AS id, count(DISTINCT e2.a) AS mutual
              FROM edges e1
              JOIN edges e2 ON e2.a = e1.b
             WHERE e1.a = ? AND e2.b <> ?
             GROUP BY e2.b
          )
          SELECT p.id AS id, coalesce(s.mutual, 0) AS mutual
            FROM named p
            LEFT JOIN second s ON s.id = p.id
           WHERE p.id <> ?
             AND p.id NOT IN (SELECT id FROM mine)
             AND NOT EXISTS (
               SELECT 1 FROM site_connections c
                WHERE (c.requester_id = ? AND c.addressee_id = p.id)
                   OR (c.requester_id = p.id AND c.addressee_id = ?)
             )
           ORDER BY mutual DESC, p.name ASC
           LIMIT ?`,
    args: [viewerId, viewerId, viewerId, viewerId, viewerId, viewerId, Math.min(Math.max(limit, 1), 24)],
  });

  if (!result.rows.length) return [];

  const cards = await readPersonCards(result.rows.map((row) => String(row.id)));

  return result.rows
    .map((row) => {
      const card = cards.get(String(row.id));
      return card ? { ...card, mutual: Number(row.mutual ?? 0) } : null;
    })
    .filter((card): card is PersonCard => Boolean(card));
}

/** Everything /seeker/network prints, in one pass over the graph. */
export async function readNetworkOverview(viewerId: string): Promise<NetworkOverview> {
  await ensureSchema();

  const connection = db();

  const [counts, invitations, outgoing, connections, suggestions] =
    await Promise.all([
      readNetworkCounts(viewerId),
      connection.execute({
        sql: `SELECT requester_id AS id FROM site_connections
              WHERE addressee_id = ? AND status = 'pending'
              ORDER BY created DESC LIMIT 30`,
        args: [viewerId],
      }),
      connection.execute({
        sql: `SELECT addressee_id AS id FROM site_connections
              WHERE requester_id = ? AND status = 'pending'
              ORDER BY created DESC LIMIT 30`,
        args: [viewerId],
      }),
      connection.execute({
        sql: `SELECT CASE WHEN requester_id = ? THEN addressee_id ELSE requester_id END AS id
              FROM site_connections
              WHERE status = 'accepted' AND (requester_id = ? OR addressee_id = ?)
              ORDER BY responded DESC, created DESC LIMIT 60`,
        args: [viewerId, viewerId, viewerId],
      }),
      readNetworkSuggestions(viewerId, 6),
    ]);

  const ids = [
    ...invitations.rows.map((row) => String(row.id)),
    ...outgoing.rows.map((row) => String(row.id)),
    ...connections.rows.map((row) => String(row.id)),
  ];

  const cards = await readPersonCards(ids);

  function list(rows: readonly Record<string, unknown>[]): PersonCard[] {
    return rows
      .map((row) => cards.get(String(row.id)))
      .filter((card): card is PersonCard => Boolean(card));
  }

  return {
    counts,
    invitations: list(invitations.rows),
    outgoing: list(outgoing.rows),
    connections: list(connections.rows),
    suggestions,
  };
}

/** People the reader and one person both know, best first. */
async function readMutual(viewerId: string, personId: string, limit = 6) {
  if (viewerId === personId) return [];

  const result = await db().execute({
    sql: `WITH edges AS (
            SELECT requester_id AS a, addressee_id AS b
              FROM site_connections WHERE status = 'accepted'
            UNION ALL
            SELECT addressee_id AS a, requester_id AS b
              FROM site_connections WHERE status = 'accepted'
          )
          SELECT e1.b AS id
            FROM edges e1
            JOIN edges e2 ON e1.b = e2.a
           WHERE e1.a = ? AND e2.b = ?
           LIMIT ?`,
    args: [viewerId, personId, Math.min(Math.max(limit, 1), 12)],
  });

  if (!result.rows.length) return [];

  const cards = await readPersonCards(result.rows.map((row) => String(row.id)));

  return result.rows
    .map((row) => cards.get(String(row.id)))
    .filter((card): card is PersonCard => Boolean(card));
}

// ------------------------------------------------------------------
//  The public profile
// ------------------------------------------------------------------

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function experienceOf(value: unknown): PublicExperience[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .slice(0, 20)
    .map((entry) => ({
      title: text(entry.title),
      company: text(entry.company),
      employmentType: text(entry.employmentType),
      location: text(entry.location),
      start: text(entry.start),
      end: text(entry.end),
      current: entry.current === true,
      description: text(entry.description),
    }))
    .filter((entry) => entry.title || entry.company);
}

function educationOf(value: unknown): PublicEducation[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .slice(0, 10)
    .map((entry) => ({
      college: text(entry.college),
      course: text(entry.course),
      speciality: text(entry.speciality),
      startYear: text(entry.startYear),
      endYear: text(entry.endYear),
      current: entry.current === true,
      grade: text(entry.grade),
    }))
    .filter((entry) => entry.college || entry.course);
}

function skillsOf(value: unknown): PublicSkill[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .slice(0, 40)
    .map((entry) => ({
      name: text(entry.name),
      level: text(entry.level),
    }))
    .filter((entry) => entry.name);
}

/**
 * The stored profile JSON, mirrored on save or read from the older app.
 *
 * Read leniently on purpose: a profile written before a field existed is
 * still a profile, and a missing about section must not blank the page.
 */
async function readStoredProfile(userId: string) {
  const connection = db();

  let raw: unknown = null;

  const stored = await connection.execute({
    sql: "SELECT profile FROM site_profiles WHERE user_id = ?",
    args: [userId],
  });

  raw = stored.rows[0]?.profile ?? null;

  if (typeof raw !== "string") {
    const legacy = await connection.execute({
      sql: "SELECT profile FROM seeker_profiles WHERE user_id = ?",
      args: [userId],
    });

    raw = legacy.rows[0]?.profile ?? null;
  }

  if (typeof raw !== "string") return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") return null;

  const source = parsed as Record<string, unknown>;

  return {
    about: text(source.about),
    city: text(source.city),
    country: text(source.country),
    website: text(source.website),
    linkedin: text(source.linkedin),
    github: text(source.github),
    experience: experienceOf(source.experience),
    education: educationOf(source.education),
    skills: skillsOf(source.skills),
  };
}

/**
 * One person's profile as the reader may see it.
 *
 * Until the reader follows or connects, the detail is not read at all —
 * the lock is on the server, not a blur over rendered text.
 */
export async function readPublicProfile(
  viewerId: string,
  id: string,
): Promise<PublicProfile | null> {
  const personId = readSocialId(id, "That person could not be found.");

  await ensureSchema();

  const person = await readPerson(personId);
  if (!person) return null;

  const connection = db();

  const [state, follows, counts, pictures, mutual, cards, details] =
    await Promise.all([
      readConnectionState(viewerId, personId),
      connection.execute({
        sql: "SELECT 1 AS yes FROM site_follows WHERE follower_id = ? AND followee_id = ?",
        args: [viewerId, personId],
      }),
      connection.execute({
        sql: `SELECT
                (SELECT count(*) FROM site_connections
                  WHERE status = 'accepted'
                    AND (requester_id = ? OR addressee_id = ?)) AS connections,
                (SELECT count(*) FROM site_follows WHERE followee_id = ?) AS followers,
                (SELECT count(*) FROM site_posts
                  WHERE user_id = ? AND deleted = 0) AS posts`,
        args: [personId, personId, personId, personId],
      }),
      readProfilePictures(personId).catch(() => ({ photo: null, cover: null })),
      readMutual(viewerId, personId).catch(() => [] as PersonCard[]),
      readPersonCards([personId]),
      readStoredProfile(personId).catch(() => null),
    ]);

  const following = follows.rows.length > 0;
  const locked = state !== "connected" && state !== "self" && !following;

  const card = cards.get(personId) ?? {
    id: personId,
    name: person.name,
    username: person.username,
    headline: person.headline,
    photo: pictures.photo,
    city: "",
    mutual: mutual.length,
  };

  const row = counts.rows[0];

  return {
    person: {
      ...card,
      photo: card.photo ?? pictures.photo,
      city: details?.city || card.city,
      mutual: mutual.length,
    },
    cover: pictures.cover,
    state,
    following,
    locked,
    counts: {
      connections: Number(row?.connections ?? 0),
      followers: Number(row?.followers ?? 0),
      posts: Number(row?.posts ?? 0),
    },
    mutual,
    about: locked ? "" : details?.about ?? "",
    experience: locked ? [] : details?.experience ?? [],
    education: locked ? [] : details?.education ?? [],
    skills: locked ? [] : details?.skills ?? [],
    links: {
      website: locked ? "" : details?.website ?? "",
      linkedin: locked ? "" : details?.linkedin ?? "",
      github: locked ? "" : details?.github ?? "",
    },
  };
}

// ------------------------------------------------------------------
//  Writing the graph
// ------------------------------------------------------------------

/** Accept a pending invitation and make the pair follow each other. */
async function acceptInvitation(viewerId: string, requesterId: string) {
  const result = await db().execute({
    sql: `UPDATE site_connections SET status = 'accepted', responded = ?
          WHERE requester_id = ? AND addressee_id = ? AND status = 'pending'`,
    args: [Date.now(), requesterId, viewerId],
  });

  if (!result.rowsAffected) {
    throw new SocialError("That invitation is no longer waiting.", 404);
  }

  // Two connections see each other's posts, so accepting also puts each of
  // them in the other's Following tab — written directly rather than
  // through `setFollow`, because the follow did not come from a click and
  // should not ring a second bell.
  const now = Date.now();

  await db().batch([
    {
      sql: `INSERT OR IGNORE INTO site_follows (follower_id, followee_id, created)
            VALUES (?, ?, ?)`,
      args: [viewerId, requesterId, now],
    },
    {
      sql: `INSERT OR IGNORE INTO site_follows (follower_id, followee_id, created)
            VALUES (?, ?, ?)`,
      args: [requesterId, viewerId, now],
    },
  ]);

  await notify({
    userId: requesterId,
    actorId: viewerId,
    kind: "connection-accepted",
    entityId: viewerId,
  });

  return {
    state: "connected" as ConnectionState,
    counts: await readNetworkCounts(viewerId),
  };
}

/**
 * Send (or answer) an invitation. Two invitations in flight connect.
 *
 * `note` is the optional line the sender attaches to a brand-new invitation.
 * It is read leniently — anything that is not a string is simply no note —
 * and it only travels on the invitation the sender is creating. When the
 * other person asked first, this call becomes an acceptance, and an
 * acceptance has nothing to say back.
 */
export async function inviteToConnect(
  viewerId: string,
  targetId: string,
  note?: unknown,
) {
  const personId = readSocialId(targetId, "That person could not be found.");

  if (personId === viewerId) {
    throw new SocialError("This is your own profile.");
  }

  const message = typeof note === "string" ? note.trim().slice(0, MAX_INVITE_NOTE) : "";

  await ensureSchema();

  const person = await readPerson(personId);
  if (!person) throw new SocialError("That person could not be found.", 404);

  const existing = await db().execute({
    sql: `SELECT requester_id, status FROM site_connections
          WHERE (requester_id = ? AND addressee_id = ?)
             OR (requester_id = ? AND addressee_id = ?)
          LIMIT 1`,
    args: [viewerId, personId, personId, viewerId],
  });

  const row = existing.rows[0];

  if (row) {
    if (String(row.status) === "accepted") {
      return { state: "connected" as ConnectionState, counts: await readNetworkCounts(viewerId) };
    }

    if (String(row.requester_id) === viewerId) {
      return { state: "outgoing" as ConnectionState, counts: await readNetworkCounts(viewerId) };
    }

    // They asked first; asking back is the same as accepting.
    return acceptInvitation(viewerId, personId);
  }

  await db().execute({
    sql: `INSERT INTO site_connections
            (requester_id, addressee_id, status, created, responded)
          VALUES (?, ?, 'pending', ?, 0)`,
    args: [viewerId, personId, Date.now()],
  });

  await notify({
    userId: personId,
    actorId: viewerId,
    kind: "connection",
    entityId: viewerId,
    body: message,
  });

  return { state: "outgoing" as ConnectionState, counts: await readNetworkCounts(viewerId) };
}

/** Accept or decline an invitation someone sent the reader. */
export async function respondToInvitation(
  viewerId: string,
  requesterId: string,
  accept: boolean,
) {
  const personId = readSocialId(requesterId, "That invitation could not be found.");

  if (!accept) {
    await db().execute({
      sql: `DELETE FROM site_connections
            WHERE requester_id = ? AND addressee_id = ? AND status = 'pending'`,
      args: [personId, viewerId],
    });

    return { state: "none" as ConnectionState, counts: await readNetworkCounts(viewerId) };
  }

  return acceptInvitation(viewerId, personId);
}

/** Take back an invitation the reader sent. */
export async function withdrawInvitation(viewerId: string, targetId: string) {
  const personId = readSocialId(targetId, "That invitation could not be found.");

  await db().execute({
    sql: `DELETE FROM site_connections
          WHERE requester_id = ? AND addressee_id = ? AND status = 'pending'`,
    args: [viewerId, personId],
  });

  return { state: "none" as ConnectionState, counts: await readNetworkCounts(viewerId) };
}

/** Remove a connection. Either side may do it. */
export async function removeConnection(viewerId: string, targetId: string) {
  const personId = readSocialId(targetId, "That person could not be found.");

  await db().execute({
    sql: `DELETE FROM site_connections
          WHERE status = 'accepted'
            AND ((requester_id = ? AND addressee_id = ?)
              OR (requester_id = ? AND addressee_id = ?))`,
    args: [viewerId, personId, personId, viewerId],
  });

  return { state: "none" as ConnectionState, counts: await readNetworkCounts(viewerId) };
}

// ------------------------------------------------------------------
//  Search
// ------------------------------------------------------------------

/** Escape the three characters that would widen a LIKE pattern. */
function likeTerm(value: string) {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

/**
 * People matching a typed name or username, for the composer's mention list
 * and the inbox's "new message" search. An empty query returns the people
 * the reader is most likely to want, not the whole table.
 */
export async function searchPeople(
  viewerId: string,
  query: string,
  limit = 8,
): Promise<PersonCard[]> {
  const term = query.trim().slice(0, 60);

  if (!term) return readNetworkSuggestions(viewerId, limit);

  await ensureSchema();

  const escaped = likeTerm(term.toLowerCase());

  const result = await db().execute({
    sql: `WITH ${MEMBERS}
          SELECT id FROM named
           WHERE id <> ?
             AND (lower(name) LIKE ? ESCAPE '\\'
               OR lower(username) LIKE ? ESCAPE '\\')
           ORDER BY CASE WHEN lower(name) LIKE ? ESCAPE '\\' THEN 0 ELSE 1 END, name ASC
           LIMIT ?`,
    args: [viewerId, `%${escaped}%`, `%${escaped}%`, `${escaped}%`, limit],
  });

  if (!result.rows.length) return [];

  const cards = await readPersonCards(result.rows.map((row) => String(row.id)));

  return result.rows
    .map((row) => cards.get(String(row.id)))
    .filter((card): card is PersonCard => Boolean(card));
}
