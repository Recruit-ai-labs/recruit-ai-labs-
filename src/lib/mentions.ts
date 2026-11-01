// ------------------------------------------------------------------
//  @mentions.
//
//  A mention is written as `@username` in a post or a comment. The
//  username is resolved against the same mirror that prints names, and the
//  answer is stored in `site_post_mentions` — so a post keeps naming the
//  person it named even if the account is renamed later, and the bell is
//  written once rather than on every render.
//
//  Resolution is deliberately strict: 3–30 characters, starting with a
//  letter. An ordinary "@here" in prose therefore stays prose, which is the
//  behaviour people expect and the reason the pattern is not "any word
//  after an at sign".
// ------------------------------------------------------------------

import "server-only";

import { db, ensureSchema } from "./db";
import { notify } from "./notifications";
import { readPeople } from "./people";

/** `@name`, not inside an email address or a longer word. */
const TOKEN = /(^|[^a-z0-9_@])@([a-z][a-z0-9_]{2,29})/gi;

/** The most people one post may name. */
const LIMIT = 10;

/**
 * The usernames a piece of text names, lower-cased and de-duplicated.
 *
 * The same function runs in the composer's suggestion list and in the
 * route that writes the post, so what the browser highlights and what the
 * server notifies cannot disagree.
 */
export function mentionUsernames(text: string): string[] {
  const found = new Set<string>();

  for (const match of text.matchAll(TOKEN)) {
    found.add(match[2].toLowerCase());
    if (found.size >= LIMIT) break;
  }

  return [...found];
}

/** `@name` tokens as they appear, for the renderer's split. */
export function mentionPattern() {
  return TOKEN;
}

/** username → user id, from the mirror, then from the older app's rows. */
async function resolveUsernames(
  usernames: readonly string[],
): Promise<Map<string, string>> {
  const resolved = new Map<string, string>();
  if (!usernames.length) return resolved;

  const connection = db();
  const list = usernames.map(() => "?").join(", ");

  const mirrored = await connection.execute({
    sql: `SELECT user_id, username FROM site_people
          WHERE lower(username) IN (${list})`,
    args: [...usernames],
  });

  for (const row of mirrored.rows) {
    const username = String(row.username ?? "").toLowerCase();
    if (username) resolved.set(username, String(row.user_id));
  }

  const missing = usernames.filter((name) => !resolved.has(name));
  if (!missing.length) return resolved;

  const stored = await connection.execute({
    sql: `SELECT user_id, coalesce(json_extract(profile, '$.username'), '') AS username
          FROM seeker_profiles
          WHERE lower(json_extract(profile, '$.username')) IN (${missing.map(() => "?").join(", ")})`,
    args: missing,
  });

  for (const row of stored.rows) {
    const username = String(row.username ?? "").toLowerCase();
    if (username && !resolved.has(username)) {
      resolved.set(username, String(row.user_id));
    }
  }

  return resolved;
}

/**
 * Store who a post names and ring their bells.
 *
 * Called after the post (or comment) is already written, so a failure here
 * is reported and swallowed: the words are live, and a mention that could
 * not be recorded must not take them back.
 */
export async function recordMentions(
  postId: string,
  actorId: string,
  text: string,
  excerpt = text,
): Promise<void> {
  const names = mentionUsernames(text);
  if (!names.length) return;

  try {
    await ensureSchema();

    const resolved = await resolveUsernames(names);
    const now = Date.now();
    const targets: string[] = [];

    const writes = [...resolved.values()]
      .filter((userId) => userId !== actorId)
      .map((userId) => {
        targets.push(userId);

        return {
          sql: `INSERT OR IGNORE INTO site_post_mentions (post_id, user_id, created)
                VALUES (?, ?, ?)`,
          args: [postId, userId, now],
        };
      });

    if (!writes.length) return;

    await db().batch(writes);

    await Promise.all(
      targets.map((userId) =>
        notify({
          userId,
          actorId,
          kind: "mention",
          entityId: postId,
          body: excerpt,
        }),
      ),
    );
  } catch (error) {
    console.error("Could not record a mention", error);
  }
}

/**
 * Make a post's stored mentions match the words it carries *now*.
 *
 * An edit can add a name, drop one or leave them alone, and the rows have to
 * follow: a card that still linked a person the newest text no longer named
 * would be a lie. Only someone named for the first time gets a bell, so
 * fixing a typo cannot wake the whole thread again.
 *
 * Same swallow-on-failure rule as `recordMentions`: the words are already
 * live, and a mention bookkeeping error must not bounce the edit back.
 */
export async function syncMentions(
  postId: string,
  actorId: string,
  text: string,
  excerpt = text,
): Promise<void> {
  try {
    await ensureSchema();

    // Who the post named before this edit.
    const stored = await db().execute({
      sql: "SELECT user_id FROM site_post_mentions WHERE post_id = ?",
      args: [postId],
    });
    const before = new Set(stored.rows.map((row) => String(row.user_id)));

    // Who it names now, without the author naming themselves.
    const resolved = await resolveUsernames(mentionUsernames(text));
    const wanted = new Set(
      [...resolved.values()].filter((userId) => userId !== actorId),
    );

    const now = Date.now();
    const writes: { sql: string; args: (string | number)[] }[] = [];
    const fresh: string[] = [];

    // Unnamed since the last version: drop the row so the link goes away.
    for (const userId of before) {
      if (wanted.has(userId)) continue;
      writes.push({
        sql: "DELETE FROM site_post_mentions WHERE post_id = ? AND user_id = ?",
        args: [postId, userId],
      });
    }

    // Named for the first time: store them, and ring only these bells.
    for (const userId of wanted) {
      if (before.has(userId)) continue;
      writes.push({
        sql: `INSERT OR IGNORE INTO site_post_mentions (post_id, user_id, created)
              VALUES (?, ?, ?)`,
        args: [postId, userId, now],
      });
      fresh.push(userId);
    }

    if (!writes.length) return;

    await db().batch(writes);

    await Promise.all(
      fresh.map((userId) =>
        notify({
          userId,
          actorId,
          kind: "mention",
          entityId: postId,
          body: excerpt,
        }),
      ),
    );
  } catch (error) {
    console.error("Could not refresh a mention", error);
  }
}

/**
 * The people one piece of text names, with the names to print beside them.
 * Used by the comment route, which returns the mentions its own words added
 * so the card can link them without a refresh.
 */
export async function mentionCards(text: string) {
  const names = mentionUsernames(text);
  if (!names.length) return [];

  await ensureSchema();

  const resolved = await resolveUsernames(names);
  if (!resolved.size) return [];

  const people = await readPeople([...resolved.values()]);

  return [...resolved.entries()]
    .filter(([, userId]) => people.has(userId))
    .map(([username, id]) => ({
      id,
      username,
      name: people.get(id)?.name || "Recruit AI member",
    }));
}

/** post id → the people it names, for one page of cards. */
export async function readPostMentions(
  postIds: readonly string[],
): Promise<Map<string, string[]>> {
  const found = new Map<string, string[]>();
  if (!postIds.length) return found;

  await ensureSchema();

  const result = await db().execute({
    sql: `SELECT post_id, user_id FROM site_post_mentions
          WHERE post_id IN (${postIds.map(() => "?").join(", ")})`,
    args: [...postIds],
  });

  for (const row of result.rows) {
    const postId = String(row.post_id);
    const list = found.get(postId) ?? [];
    list.push(String(row.user_id));
    found.set(postId, list);
  }

  return found;
}
