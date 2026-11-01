// ------------------------------------------------------------------
//  The database.
//
//  One libSQL client for the whole server side, created lazily so a build
//  without credentials still compiles and a page without a database still
//  renders.
//
//  Which tables belong to whom: this database is shared with the older
//  Recruit AI workspace at D:\New folder, and it already carries that app's
//  schema — seeker_profiles, network_posts, jobs, job_applications and the
//  rest, some of them with real rows. Those tables are used as they are.
//  This workspace only creates tables that did not exist there, and every
//  one of them is prefixed `site_` so the two can never quietly collide:
//  `CREATE TABLE IF NOT EXISTS` keeps an existing shape without saying a
//  word, which is exactly how a schema drifts apart unnoticed.
//
//  Run `node scripts/schema-audit.mjs` to read the live shape again.
// ------------------------------------------------------------------

import "server-only";

import { createClient, type Client } from "@libsql/client";

/** A database problem the route can turn into a status and a sentence. */
export class DatabaseError extends Error {
  readonly status: number;

  constructor(message: string, status = 503) {
    super(message);
    this.status = status;
  }
}

const url = process.env.TURSO_DATABASE_URL ?? "";
const authToken = process.env.TURSO_AUTH_TOKEN ?? "";

let client: Client | null = null;

/** True when both Turso keys are present, whatever their value. */
export function databaseConfigured() {
  return Boolean(url && authToken);
}

/** The shared client. Throws — never returns undefined — when unconfigured. */
export function db(): Client {
  if (!url || !authToken) {
    throw new DatabaseError("The database is not configured.", 503);
  }

  client ??= createClient({ url, authToken });
  return client;
}

// ------------------------------------------------------------------
//  Tables this workspace owns
//
//  `site_people` is a mirror, not a copy: it stores only what another
//  surface needs to print next to someone's name — the display name, the
//  username and the headline. The profile itself stays the source of truth
//  in Clerk metadata; this row exists so a feed listing forty authors is
//  one query instead of forty Clerk lookups.
//
//  The five `site_post*` tables are the feed. They already exist in this
//  database with exactly the columns below — `scripts/schema-audit.mjs`
//  was run before they were written down here — so every statement is a
//  no-op on the live schema and a complete create on a fresh one. The
//  indexes are the part that is genuinely new: a feed asks "the newest
//  twelve posts" and "the counts for these ids" on every render.
//
//  A post is soft-deleted (`deleted = 1`) so a comment thread or a repost
//  can be told the original is gone instead of losing its parent.
// ------------------------------------------------------------------
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS site_people (
     user_id TEXT PRIMARY KEY,
     name TEXT NOT NULL,
     username TEXT NOT NULL DEFAULT '',
     headline TEXT NOT NULL DEFAULT '',
     updated INTEGER NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS site_people_username ON site_people (username)`,
  `CREATE TABLE IF NOT EXISTS site_posts (
     id TEXT PRIMARY KEY,
     user_id TEXT NOT NULL,
     body TEXT NOT NULL DEFAULT '',
     image TEXT,
     video TEXT,
     repost_of TEXT,
     audience TEXT NOT NULL DEFAULT 'anyone',
     created INTEGER NOT NULL,
     edited INTEGER NOT NULL DEFAULT 0,
     deleted INTEGER NOT NULL DEFAULT 0
   )`,
  `CREATE INDEX IF NOT EXISTS site_posts_created ON site_posts (created)`,
  `CREATE INDEX IF NOT EXISTS site_posts_author ON site_posts (user_id, created)`,
  `CREATE INDEX IF NOT EXISTS site_posts_repost ON site_posts (repost_of)`,
  `CREATE TABLE IF NOT EXISTS site_post_comments (
     id TEXT PRIMARY KEY,
     post_id TEXT NOT NULL,
     user_id TEXT NOT NULL,
     body TEXT NOT NULL,
     created INTEGER NOT NULL,
     deleted INTEGER NOT NULL DEFAULT 0
   )`,
  `CREATE INDEX IF NOT EXISTS site_post_comments_post
     ON site_post_comments (post_id, created)`,
  `CREATE TABLE IF NOT EXISTS site_post_reactions (
     post_id TEXT NOT NULL,
     user_id TEXT NOT NULL,
     kind TEXT NOT NULL,
     created INTEGER NOT NULL,
     PRIMARY KEY (post_id, user_id)
   )`,
  `CREATE INDEX IF NOT EXISTS site_post_reactions_post ON site_post_reactions (post_id)`,
  `CREATE TABLE IF NOT EXISTS site_post_saves (
     post_id TEXT NOT NULL,
     user_id TEXT NOT NULL,
     created INTEGER NOT NULL,
     PRIMARY KEY (post_id, user_id)
   )`,
  `CREATE INDEX IF NOT EXISTS site_post_saves_user ON site_post_saves (user_id)`,
  `CREATE TABLE IF NOT EXISTS site_follows (
     follower_id TEXT NOT NULL,
     followee_id TEXT NOT NULL,
     created INTEGER NOT NULL,
     PRIMARY KEY (follower_id, followee_id)
   )`,
  `CREATE INDEX IF NOT EXISTS site_follows_followee ON site_follows (followee_id)`,
  // The connection graph. One row per pair, whichever way it points: a
  // pending invitation is `status = 'pending'` with the requester named,
  // and an accepted one keeps the same row so the history of who asked
  // survives. Two people inviting each other at once is a connection, not
  // two invitations (see lib/network.ts).
  `CREATE TABLE IF NOT EXISTS site_connections (
     requester_id TEXT NOT NULL,
     addressee_id TEXT NOT NULL,
     status TEXT NOT NULL DEFAULT 'pending',
     created INTEGER NOT NULL,
     responded INTEGER NOT NULL DEFAULT 0,
     PRIMARY KEY (requester_id, addressee_id)
   )`,
  `CREATE INDEX IF NOT EXISTS site_connections_addressee
     ON site_connections (addressee_id, status)`,
  `CREATE INDEX IF NOT EXISTS site_connections_requester
     ON site_connections (requester_id, status)`,
  // One-to-one messages. A conversation is not a table: it is the pair of
  // the two ids, and the list of conversations is the newest row per
  // counterpart (see lib/messages.ts). `read_at` is the recipient's stamp,
  // which is what a badge counts.
  `CREATE TABLE IF NOT EXISTS site_messages (
     id TEXT PRIMARY KEY,
     sender_id TEXT NOT NULL,
     recipient_id TEXT NOT NULL,
     body TEXT NOT NULL,
     created INTEGER NOT NULL,
     read_at INTEGER
   )`,
  `CREATE INDEX IF NOT EXISTS site_messages_pair
     ON site_messages (sender_id, recipient_id, created)`,
  `CREATE INDEX IF NOT EXISTS site_messages_inbox
     ON site_messages (recipient_id, read_at)`,
  // Everything the bell shows. The row is deliberately thin — who did it,
  // what kind of thing it was, and the post or message it points at — so a
  // kind added later needs no schema change. `read_at` null is unread.
  `CREATE TABLE IF NOT EXISTS site_notifications (
     id TEXT PRIMARY KEY,
     user_id TEXT NOT NULL,
     actor_id TEXT NOT NULL,
     kind TEXT NOT NULL,
     entity_id TEXT,
     body TEXT NOT NULL DEFAULT '',
     created INTEGER NOT NULL,
     read_at INTEGER
   )`,
  `CREATE INDEX IF NOT EXISTS site_notifications_user
     ON site_notifications (user_id, created)`,
  // Who a post names with @username. Stored rather than re-parsed on read
  // so a renamed account cannot silently change the meaning of an old
  // post, and so the notification and the link are decided once.
  `CREATE TABLE IF NOT EXISTS site_post_mentions (
     post_id TEXT NOT NULL,
     user_id TEXT NOT NULL,
     created INTEGER NOT NULL,
     PRIMARY KEY (post_id, user_id)
   )`,
  `CREATE INDEX IF NOT EXISTS site_post_mentions_user
     ON site_post_mentions (user_id, created)`,
  // The whole profile, mirrored beside the name in `site_people`. The
  // public profile page needs about, experience, education and skills for
  // someone who is not the reader, and asking Clerk once per visitor is
  // not a plan. Written by `rememberPerson` on every profile save; a row
  // missing here still falls back to the older app's `seeker_profiles`.
  `CREATE TABLE IF NOT EXISTS site_profiles (
     user_id TEXT PRIMARY KEY,
     city TEXT NOT NULL DEFAULT '',
     country TEXT NOT NULL DEFAULT '',
     profile TEXT NOT NULL,
     updated INTEGER NOT NULL
   )`,
  // Profile pictures. This table already exists in the shared database and
  // belongs to the older workspace, which writes it as `kind` being "cover"
  // or "photo" and `data` holding a whole data URL. It is written the same
  // way here so both apps read the same photograph. There is no key on it,
  // so writes are delete-then-insert (see lib/media.ts) and the index below
  // is a plain one — a UNIQUE constraint would fail on a live duplicate.
  `CREATE TABLE IF NOT EXISTS site_media (
     user_id TEXT NOT NULL,
     kind TEXT NOT NULL,
     data TEXT NOT NULL,
     updated INTEGER NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS site_media_owner ON site_media (user_id, kind)`,
  // Who has opened whose profile. One row per pair rather than a log of
  // every look: the question a member asks is "who viewed my profile, most
  // recent first", and a repeat visit only moves the stamp and adds one to
  // `visits`. The sum of `visits` is the view counter, the row count is the
  // number of people. Nothing but the owner ever reads this list — a face
  // and a headline are shown to the person they were shown to, and to nobody
  // else (see lib/profile-views.ts).
  `CREATE TABLE IF NOT EXISTS site_profile_views (
     viewer_id TEXT NOT NULL,
     owner_id TEXT NOT NULL,
     created INTEGER NOT NULL,
     visits INTEGER NOT NULL DEFAULT 1,
     PRIMARY KEY (viewer_id, owner_id)
   )`,
  `CREATE INDEX IF NOT EXISTS site_profile_views_owner
     ON site_profile_views (owner_id, created)`,
];

// The prepare step runs once per server process, not once per request.
// A rejection clears the memo so the next request tries again rather than
// inheriting a permanently broken promise.
let ready: Promise<void> | null = null;

/**
 * Add a column to an existing table, once.
 *
 * `CREATE TABLE IF NOT EXISTS` is a no-op against the live schema, so a
 * column introduced after a table first shipped has to arrive by `ALTER`.
 * SQLite has no `ADD COLUMN IF NOT EXISTS`, so the column list is read
 * first and the statement only runs when the name is genuinely missing —
 * repeating `ensureSchema` never errors on a duplicate.
 */
async function addColumnIfMissing(
  connection: Client,
  table: string,
  column: string,
  definition: string,
) {
  const info = await connection.execute(`PRAGMA table_info(${table})`);
  const present = info.rows.some((row) => String(row.name) === column);
  if (present) return;

  await connection.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

/** Create this workspace's tables if they are missing. Idempotent. */
export function ensureSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const connection = db();
      for (const statement of SCHEMA) {
        await connection.execute(statement);
      }

      // The clip a post can carry: added after `site_posts` first shipped,
      // so a live database needs the ALTER the CREATE cannot give it.
      await addColumnIfMissing(connection, "site_posts", "video", "TEXT");
    })().catch((error) => {
      ready = null;
      throw error;
    });
  }

  return ready;
}
