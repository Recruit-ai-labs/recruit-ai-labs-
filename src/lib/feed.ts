// ------------------------------------------------------------------
//  The feed — everything between a post and the card that draws it.
//
//  One module owns the four tables a post touches (`site_posts`,
//  `site_post_comments`, `site_post_reactions`, `site_post_saves`) and the
//  follow graph that decides who sees what. The browser never talks SQL:
//  routes call the functions here, and every function returns a whole
//  `FeedPost` or the few numbers a card needs to stay in sync.
//
//  Two decisions worth naming:
//
//  · Authors are resolved in one query, through `people.ts`. Without the
//    mirror a feed of forty posts would be forty Clerk lookups.
//  · Reactions and follows are delete-then-insert rather than
//    `INSERT OR REPLACE`, because the live tables were created without a
//    composite primary key. The pair is treated as the key either way.
// ------------------------------------------------------------------

import "server-only";

import { randomUUID } from "node:crypto";

import { sameOrigin, type Account } from "./account";
import { db, DatabaseError, ensureSchema } from "./db";
import {
  isReactionKind,
  MAX_COMMENT_BODY,
  MAX_IMAGE_LENGTH,
  MAX_POST_BODY,
  MAX_REPOST_NOTE,
  type Audience,
  type FeedActivity,
  type FeedAuthor,
  type FeedComment,
  type FeedFilter,
  type FeedMention,
  type FeedPage,
  type FeedPost,
  type FeedQuote,
  type ReactionKind,
} from "./feed-types";
import { mentionCards, readPostMentions, recordMentions, syncMentions } from "./mentions";
import { notify } from "./notifications";
import { personName, readPeople, readPerson } from "./people";
import { dropPostImage, storePostImage } from "./post-image";

/** An expected failure: a message and status a route can send as-is. */
export class FeedError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Just enough of the account to read and write a feed as that person. */
export type Viewer = {
  id: string;
  name: string;
  username: string;
  headline: string;
};

export function viewerOf(account: Account): Viewer {
  return {
    id: account.userId,
    name: personName(account.profile) || account.email.split("@")[0] || "You",
    username: account.profile.username,
    headline: account.profile.headline,
  };
}

const ID = /^[A-Za-z0-9_-]{1,64}$/;

/** A table id, checked before it is ever used as a parameter. */
function readId(value: unknown, message = "That post could not be found.") {
  if (typeof value !== "string" || !ID.test(value)) {
    throw new FeedError(message, 404);
  }

  return value;
}

function makeId(prefix: "p" | "c") {
  return `${prefix}_${randomUUID().replace(/-/g, "")}`;
}

/** Trimmed text, refusing the control characters that would break a card. */
function readText(value: unknown, max: number, label: string, required: boolean) {
  if (value === undefined || value === null) {
    if (required) throw new FeedError(`Write ${label} first.`);
    return "";
  }
  if (typeof value !== "string") throw new FeedError("Check what you wrote and try again.");
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) {
    throw new FeedError("Check what you wrote and try again.");
  }

  const text = value.trim();
  if (text.length > max) throw new FeedError(`Keep it under ${max} characters.`);
  if (required && !text) throw new FeedError(`Write ${label} first.`);

  return text;
}

/**
 * A photo the composer already re-encoded: either an inline data URL or a
 * plain https link. Anything else is refused rather than stored, because a
 * `javascript:` src on a card is an XSS waiting for a click.
 */
function readImage(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new FeedError("That photo could not be attached.");

  if (value.length > MAX_IMAGE_LENGTH) {
    throw new FeedError("That photo is too large. Try a smaller one.", 413);
  }

  if (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value)) {
    return value;
  }

  if (/^https:\/\/[^\s]+$/.test(value) && value.length <= 500) return value;

  throw new FeedError("That photo could not be attached.");
}

function readAudience(value: unknown): Audience {
  return value === "followers" ? "followers" : "anyone";
}

/**
 * A clip's public address. The browser streams the bytes to Vercel Blob and
 * hands back only the URL, so the row stores a short https link — never a
 * data URL. A `javascript:` or plain-text src on a card is an XSS waiting
 * for a play, so anything that is not a bare https URL is refused.
 */
function readVideo(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.startsWith("data:")) {
    throw new FeedError("That video could not be attached.");
  }

  if (value.length > 500 || !/^https:\/\/[^\s]+$/.test(value)) {
    throw new FeedError("That video could not be attached.");
  }

  return value;
}

// ------------------------------------------------------------------
//  Reading
// ------------------------------------------------------------------

type Row = {
  id: string;
  user_id: string;
  body: string;
  image: string | null;
  video: string | null;
  repost_of: string | null;
  audience: string;
  created: number;
  edited: number;
  likes: number;
  comments: number;
  reposts: number;
  liked: number;
  /** The reader's own reaction, or a database null. */
  reaction: string | null;
  saved: number;
};

type SelectOptions = {
  /** One post, for a permalink or the moment after writing. */
  id?: string;
  /** Everything one person wrote, for their profile's activity list. */
  author?: string;
  /** Older than this timestamp — the "show older posts" cursor. */
  before?: number;
  filter?: FeedFilter;
  limit: number;
};

/**
 * One query for the posts and their counts. The counts are scalar
 * subqueries rather than a second round trip: over a remote database the
 * round trips are what a reader feels.
 */
async function selectRows(viewerId: string, options: SelectOptions) {
  const where = [
    "p.deleted = 0",
    "(p.audience = 'anyone' OR p.user_id = ? OR p.user_id IN (SELECT followee_id FROM site_follows WHERE follower_id = ?))",
  ];

  // Two slots for the audience clause, then the reader's three reads in the
  // select list — liked, reaction, saved — one slot each, in the order the
  // columns are named.
  const args: (string | number)[] = [
    viewerId,
    viewerId,
    viewerId,
    viewerId,
    viewerId,
  ];

  if (options.filter === "following") {
    where.push(
      "(p.user_id = ? OR p.user_id IN (SELECT followee_id FROM site_follows WHERE follower_id = ?))",
    );
    args.push(viewerId, viewerId);
  }

  if (options.filter === "saved") {
    where.push(
      "EXISTS (SELECT 1 FROM site_post_saves sv WHERE sv.post_id = p.id AND sv.user_id = ?)",
    );
    args.push(viewerId);
  }

  if (options.id) {
    where.push("p.id = ?");
    args.push(options.id);
  }

  if (options.author) {
    where.push("p.user_id = ?");
    args.push(options.author);
  }

  if (options.before) {
    where.push("p.created < ?");
    args.push(options.before);
  }

  args.push(options.limit);

  const result = await db().execute({
    sql: `SELECT p.id, p.user_id, p.body, p.image, p.video, p.repost_of, p.audience,
                 p.created, p.edited,
                 (SELECT count(*) FROM site_post_reactions r
                   WHERE r.post_id = p.id) AS likes,
                 (SELECT count(*) FROM site_post_comments c
                   WHERE c.post_id = p.id AND c.deleted = 0) AS comments,
                 (SELECT count(*) FROM site_posts q
                   WHERE q.repost_of = p.id AND q.deleted = 0) AS reposts,
                 (CASE WHEN EXISTS (
                    SELECT 1 FROM site_post_reactions r
                     WHERE r.post_id = p.id AND r.user_id = ?) THEN 1 ELSE 0 END) AS liked,
                 (SELECT r.kind FROM site_post_reactions r
                   WHERE r.post_id = p.id AND r.user_id = ?
                   LIMIT 1) AS reaction,
                 (CASE WHEN EXISTS (
                    SELECT 1 FROM site_post_saves s
                     WHERE s.post_id = p.id AND s.user_id = ?) THEN 1 ELSE 0 END) AS saved
          FROM site_posts p
          WHERE ${where.join(" AND ")}
          ORDER BY p.created DESC, p.id DESC
          LIMIT ?`,
    args,
  });

  return result.rows as unknown as Row[];
}

/**
 * Turn rows into cards: authors resolved in one query, the two newest
 * comments per post, and the originals a repost quotes.
 *
 * The three reads do not depend on each other, so they leave at once. They
 * used to be awaited one after another, which on a remote database is three
 * round trips instead of one, and that is time a reader waits for nothing.
 */
async function hydrate(viewer: Viewer, rows: Row[]): Promise<FeedPost[]> {
  if (!rows.length) return [];

  const connection = db();
  const ids = rows.map((row) => row.id);
  const marks = ids.map(() => "?").join(", ");
  const quoteIds = [
    ...new Set(rows.map((row) => row.repost_of).filter((id): id is string => Boolean(id))),
  ];

  const [comments, quotes, follows, mentions] = await Promise.all([
    connection.execute({
      sql: `SELECT id, post_id, user_id, body, created
            FROM site_post_comments
            WHERE deleted = 0 AND post_id IN (${marks})
            ORDER BY created DESC`,
      args: ids,
    }),
    quoteIds.length
      ? connection.execute({
          sql: `SELECT id, user_id, body, image, created
                FROM site_posts
                WHERE deleted = 0 AND id IN (${quoteIds.map(() => "?").join(", ")})`,
          args: quoteIds,
        })
      : Promise.resolve(null),
    connection.execute({
      sql: "SELECT followee_id FROM site_follows WHERE follower_id = ?",
      args: [viewer.id],
    }),
    readPostMentions(ids),
  ]);

  const followed = new Set(follows.rows.map((row) => String(row.followee_id)));

  // Two newest per post, kept in the order the query returned them.
  const preview = new Map<string, FeedComment[]>();
  const previewBodies = new Map<string, { id: string; user_id: string; body: string; created: number }[]>();

  for (const row of comments.rows) {
    const postId = String(row.post_id);
    const list = previewBodies.get(postId) ?? [];
    if (list.length < 2) {
      list.push({
        id: String(row.id),
        user_id: String(row.user_id),
        body: String(row.body),
        created: Number(row.created),
      });
      previewBodies.set(postId, list);
    }
  }

  const quoteRows = new Map(
    (quotes?.rows ?? []).map((row) => [
      String(row.id),
      {
        user_id: String(row.user_id),
        body: String(row.body ?? ""),
        image: row.image === null ? null : String(row.image),
        created: Number(row.created),
      },
    ]),
  );

  // Every author on the page — posts, comments and quoted originals — in
  // one lookup, capped by `readPeople` itself.
  const people = await readPeople([
    ...new Set([
      viewer.id,
      ...rows.map((row) => row.user_id),
      ...(quotes?.rows ?? []).map((row) => String(row.user_id)),
      ...[...previewBodies.values()].flat().map((comment) => comment.user_id),
      ...[...mentions.values()].flat(),
    ]),
  ]);

  function authorOf(id: string): FeedAuthor {
    const person = people.get(id);
    const self = id === viewer.id;

    return {
      id,
      name: (self ? viewer.name : person?.name) || person?.name || "Recruit AI member",
      username: (self ? viewer.username : person?.username) || person?.username || "",
      headline: (self ? viewer.headline : person?.headline) || person?.headline || "",
      following: !self && followed.has(id),
    };
  }

  // A mention is only worth printing when the username that would link it
  // is known; anything else stays plain words in the body.
  function mentionOf(userId: string): FeedMention | null {
    const person = people.get(userId);
    if (!person?.username) return null;

    return { id: userId, username: person.username, name: person.name };
  }

  function commentOf(entry: {
    id: string;
    user_id: string;
    body: string;
    created: number;
  }): FeedComment {
    return {
      id: entry.id,
      author: authorOf(entry.user_id),
      body: entry.body,
      created: entry.created,
      mine: entry.user_id === viewer.id,
    };
  }

  for (const [postId, list] of previewBodies) {
    preview.set(
      postId,
      list
        .slice()
        .reverse()
        .map(commentOf),
    );
  }

  return rows.map((row) => {
    const quote = row.repost_of ? quoteRows.get(row.repost_of) : null;

    const quoteCard: FeedQuote | null = row.repost_of
      ? quote
        ? {
            id: row.repost_of,
            author: authorOf(quote.user_id),
            body: quote.body,
            image: quote.image,
            created: quote.created,
          }
        : {
            id: row.repost_of,
            author: {
              id: "",
              name: "Post unavailable",
              username: "",
              headline: "",
              following: false,
            },
            body: "This post is no longer available.",
            image: null,
            created: 0,
          }
      : null;

    return {
      id: row.id,
      author: authorOf(row.user_id),
      body: String(row.body ?? ""),
      image: row.image === null ? null : String(row.image),
      video: row.video === null || row.video === "" ? null : String(row.video),
      audience: row.audience === "followers" ? "followers" : "anyone",
      created: Number(row.created),
      edited: Number(row.edited) === 1,
      mine: row.user_id === viewer.id,
      likes: Number(row.likes ?? 0),
      comments: Number(row.comments ?? 0),
      reposts: Number(row.reposts ?? 0),
      liked: Number(row.liked) === 1,
      // The column carries whatever the table's `kind` held. An older row,
      // or a kind this build has never heard of, reads as no reaction at all
      // rather than as a glyph the picker cannot draw.
      reaction: isReactionKind(row.reaction) ? row.reaction : null,
      saved: Number(row.saved) === 1,
      quote: quoteCard,
      preview: preview.get(row.id) ?? [],
      mentions: (mentions.get(row.id) ?? [])
        .map(mentionOf)
        .filter((mention): mention is FeedMention => Boolean(mention)),
    };
  });
}

/** The feed, newest first, one page at a time. */
export async function readFeed(
  viewer: Viewer,
  options: { filter?: FeedFilter; before?: number; limit?: number } = {},
): Promise<FeedPage> {
  await ensureSchema();

  const limit = Math.min(Math.max(Math.trunc(options.limit ?? 12), 1), 30);

  // One extra row answers "is there another page?" without a count query.
  const rows = await selectRows(viewer.id, {
    filter: options.filter,
    before: options.before,
    limit: limit + 1,
  });

  const page = rows.slice(0, limit);
  const posts = await hydrate(viewer, page);

  return {
    posts,
    cursor: rows.length > limit ? Number(page[page.length - 1].created) : null,
  };
}

/**
 * The newest posts by one person, for their profile's activity list.
 *
 * Same visibility rule as the feed: a followers-only post is only read for
 * a reader who follows them, and the owner always sees their own.
 */
export async function readProfilePosts(
  viewer: Viewer,
  authorId: string,
  limit = 3,
): Promise<FeedPost[]> {
  const author = readId(authorId, "That person could not be found.");

  await ensureSchema();

  const rows = await selectRows(viewer.id, {
    author,
    limit: Math.min(Math.max(Math.trunc(limit), 1), 12),
  });

  return hydrate(viewer, rows);
}

/** One post, or null when it is gone or not visible to this reader. */
export async function readPost(viewer: Viewer, id: string) {
  const postId = readId(id);
  await ensureSchema();

  const rows = await selectRows(viewer.id, { id: postId, limit: 1 });
  if (!rows.length) return null;

  const [post] = await hydrate(viewer, rows);
  return post ?? null;
}

/** Every comment on a post, newest first. */
export async function readComments(viewer: Viewer, id: string) {
  const postId = readId(id);
  await ensureSchema();

  const rows = await db().execute({
    sql: `SELECT id, user_id, body, created
          FROM site_post_comments
          WHERE deleted = 0 AND post_id = ?
          ORDER BY created DESC
          LIMIT 200`,
    args: [postId],
  });

  const people = await readPeople([
    viewer.id,
    ...rows.rows.map((row) => String(row.user_id)),
  ]);

  return rows.rows.map((row): FeedComment => {
    const userId = String(row.user_id);
    const person = people.get(userId);
    const self = userId === viewer.id;

    return {
      id: String(row.id),
      author: {
        id: userId,
        name: (self ? viewer.name : person?.name) || person?.name || "Recruit AI member",
        username: (self ? viewer.username : person?.username) || person?.username || "",
        headline: (self ? viewer.headline : person?.headline) || person?.headline || "",
        following: false,
      },
      body: String(row.body),
      created: Number(row.created),
      mine: self,
    };
  });
}

/** The four numbers the right rail prints. */
export async function readActivity(viewerId: string): Promise<FeedActivity> {
  await ensureSchema();

  const result = await db().execute({
    sql: `SELECT
            (SELECT count(*) FROM site_posts
              WHERE user_id = ? AND deleted = 0) AS posts,
            (SELECT count(*) FROM site_post_reactions r
               JOIN site_posts p ON p.id = r.post_id
              WHERE p.user_id = ? AND p.deleted = 0) AS reactions,
            (SELECT count(*) FROM site_post_comments c
               JOIN site_posts p ON p.id = c.post_id
              WHERE p.user_id = ? AND p.deleted = 0 AND c.user_id <> ?) AS comments,
            (SELECT count(*) FROM site_follows WHERE followee_id = ?) AS followers`,
    args: [viewerId, viewerId, viewerId, viewerId, viewerId],
  });

  const row = result.rows[0];

  return {
    posts: Number(row?.posts ?? 0),
    reactions: Number(row?.reactions ?? 0),
    comments: Number(row?.comments ?? 0),
    followers: Number(row?.followers ?? 0),
  };
}

/**
 * People worth following: everyone this workspace knows about, minus the
 * viewer and minus the people already followed. Two writers feed the name
 * (see people.ts), so both tables are read and merged.
 */
export async function readSuggestions(viewerId: string, limit = 3): Promise<FeedAuthor[]> {
  await ensureSchema();

  const connection = db();

  const [mirrored, legacy, follows] = await Promise.all([
    connection.execute({
      sql: `SELECT user_id, name, username, headline
            FROM site_people WHERE user_id <> ?`,
      args: [viewerId],
    }),
    connection.execute({
      sql: `SELECT user_id,
                   trim(
                     coalesce(json_extract(profile, '$.firstName'), '') || ' ' ||
                     coalesce(json_extract(profile, '$.lastName'), '')
                   ) AS name,
                   coalesce(json_extract(profile, '$.username'), '') AS username,
                   coalesce(json_extract(profile, '$.headline'), '') AS headline
            FROM seeker_profiles
            WHERE user_id <> ?`,
      args: [viewerId],
    }),
    connection.execute({
      sql: "SELECT followee_id FROM site_follows WHERE follower_id = ?",
      args: [viewerId],
    }),
  ]);

  const followed = new Set(follows.rows.map((row) => String(row.followee_id)));
  const people = new Map<string, FeedAuthor>();

  // The mirror is written first, so it wins a name clash.
  for (const row of [...mirrored.rows, ...legacy.rows]) {
    const id = String(row.user_id);
    if (followed.has(id) || people.has(id)) continue;

    const name = String(row.name ?? "").trim();
    if (!name) continue;

    people.set(id, {
      id,
      name,
      username: String(row.username ?? ""),
      headline: String(row.headline ?? ""),
      following: false,
    });
  }

  return [...people.values()].slice(0, Math.min(Math.max(limit, 1), 6));
}

// ------------------------------------------------------------------
//  Writing
// ------------------------------------------------------------------

async function requireVisible(id: string) {
  const postId = readId(id);

  // The photo comes back with the author because an edit has to know whether
  // the post can survive an empty body: a caption under a picture may be
  // deleted, a post with neither words nor picture may not.
  const result = await db().execute({
    sql: "SELECT user_id, image FROM site_posts WHERE id = ? AND deleted = 0",
    args: [postId],
  });

  if (!result.rows.length) throw new FeedError("That post is no longer there.", 404);

  const row = result.rows[0];

  return {
    id: postId,
    author: String(row.user_id),
    image: row.image === null || row.image === undefined ? null : String(row.image),
  };
}

/** The five numbers a card keeps in sync, read back after a write. */
async function countsOf(postId: string, viewerId: string) {
  const result = await db().execute({
    sql: `SELECT
            (SELECT count(*) FROM site_post_reactions WHERE post_id = ?) AS likes,
            (SELECT count(*) FROM site_post_comments
              WHERE post_id = ? AND deleted = 0) AS comments,
            (SELECT count(*) FROM site_posts
              WHERE repost_of = ? AND deleted = 0) AS reposts,
            (CASE WHEN EXISTS (
              SELECT 1 FROM site_post_reactions
               WHERE post_id = ? AND user_id = ?) THEN 1 ELSE 0 END) AS liked,
            (SELECT r.kind FROM site_post_reactions r
              WHERE r.post_id = ? AND r.user_id = ?
              LIMIT 1) AS reaction,
            (CASE WHEN EXISTS (
              SELECT 1 FROM site_post_saves
               WHERE post_id = ? AND user_id = ?) THEN 1 ELSE 0 END) AS saved`,
    args: [
      postId,
      postId,
      postId,
      postId,
      viewerId,
      postId,
      viewerId,
      postId,
      viewerId,
    ],
  });

  const row = result.rows[0];

  return {
    likes: Number(row?.likes ?? 0),
    comments: Number(row?.comments ?? 0),
    reposts: Number(row?.reposts ?? 0),
    liked: Number(row?.liked) === 1,
    reaction: isReactionKind(row?.reaction) ? row.reaction : null,
    saved: Number(row?.saved) === 1,
  };
}

export async function createPost(
  viewer: Viewer,
  input: Record<string, unknown>,
): Promise<FeedPost> {
  const body = readText(input.body, MAX_POST_BODY, "something", false);
  const image = readImage(input.image);
  const video = readVideo(input.video);
  const audience = readAudience(input.audience);

  if (!body && !image && !video) {
    throw new FeedError("Write something, or attach a photo or video.");
  }

  await ensureSchema();

  const id = makeId("p");

  // An inline photo is pushed to object storage and only its short public
  // URL is written to the row, so a feed read never carries base64. A link
  // the composer was given (already https) is kept as it is. A clip arrives
  // already hosted, so only its URL travels through here.
  const storedImage =
    image && image.startsWith("data:") ? await storePostImage(image, id) : image;

  await db().execute({
    sql: `INSERT INTO site_posts
            (id, user_id, body, image, video, repost_of, audience, created, edited, deleted)
          VALUES (?, ?, ?, ?, ?, NULL, ?, ?, 0, 0)`,
    args: [id, viewer.id, body, storedImage, video, audience, Date.now()],
  });

  // Before the card is read back, so the post a composer puts at the top of
  // the feed already links the people it named and their bells have rung.
  await recordMentions(id, viewer.id, body, body.slice(0, 140));

  const post = await readPost(viewer, id);
  if (!post) throw new FeedError("The post could not be read back.", 503);

  return post;
}

/**
 * Rewrite the words of your own post.
 *
 * Only the body moves: the picture, the audience and, above all, the
 * timestamp stay where they were, because an edit says "this is what I
 * meant" rather than "here is something new". The card keeps its place in
 * the feed and simply admits it was edited — the same bargain LinkedIn
 * makes, and the reason `edited` is a flag on the row and not a new row.
 */
export async function editPost(
  viewer: Viewer,
  id: string,
  input: unknown,
): Promise<FeedPost> {
  const post = await requireVisible(id);

  // Somebody else's words are not ours to change, and the answer says so
  // rather than quietly writing nothing.
  if (post.author !== viewer.id) {
    throw new FeedError("Only the author can change that post.", 403);
  }

  const body = readText(input, MAX_POST_BODY, "something", false);
  if (!body && !post.image) {
    throw new FeedError("Write something, or keep the photo's caption.");
  }

  await db().execute({
    sql: "UPDATE site_posts SET body = ?, edited = 1 WHERE id = ?",
    args: [body, post.id],
  });

  // The named people follow the new words, and only a genuinely new name
  // rings a bell — a typo fix must not wake the whole thread.
  await syncMentions(post.id, viewer.id, body, body.slice(0, 140));

  const fresh = await readPost(viewer, post.id);
  if (!fresh) throw new FeedError("The post could not be read back.", 503);

  return fresh;
}

/**
 * React, change a reaction, or take it back.
 *
 * `kind` is the reaction to leave on the post, or null to remove it. One
 * person is one row — the primary key is the pair — so switching from Like
 * to Love rewrites the row rather than adding a second reaction, which is
 * how the count stays honest: a person is never counted twice.
 *
 * The bell rings only when a reaction appears where there was none. Changing
 * your mind about *which* reaction is not new news to the author, and taking
 * a reaction back must not send a fresh notification either.
 */
export async function setReaction(
  viewerId: string,
  id: string,
  kind: ReactionKind | null,
) {
  const post = await requireVisible(id);
  const connection = db();

  const existing = await connection.execute({
    sql: "SELECT kind FROM site_post_reactions WHERE post_id = ? AND user_id = ?",
    args: [post.id, viewerId],
  });

  const had = existing.rows.length > 0;

  if (kind === null) {
    await connection.execute({
      sql: "DELETE FROM site_post_reactions WHERE post_id = ? AND user_id = ?",
      args: [post.id, viewerId],
    });
  } else if (had) {
    await connection.execute({
      sql: `UPDATE site_post_reactions SET kind = ?, created = ?
            WHERE post_id = ? AND user_id = ?`,
      args: [kind, Date.now(), post.id, viewerId],
    });
  } else {
    await connection.execute({
      sql: `INSERT INTO site_post_reactions (post_id, user_id, kind, created)
            VALUES (?, ?, ?, ?)`,
      args: [post.id, viewerId, kind, Date.now()],
    });

    await notify({
      userId: post.author,
      actorId: viewerId,
      kind: "like",
      entityId: post.id,
    });
  }

  const counts = await countsOf(post.id, viewerId);
  return { likes: counts.likes, liked: counts.liked, reaction: counts.reaction };
}

export async function setSaved(viewerId: string, id: string, saved: boolean) {
  const post = await requireVisible(id);

  await db().execute({
    sql: "DELETE FROM site_post_saves WHERE post_id = ? AND user_id = ?",
    args: [post.id, viewerId],
  });

  if (saved) {
    await db().execute({
      sql: "INSERT INTO site_post_saves (post_id, user_id, created) VALUES (?, ?, ?)",
      args: [post.id, viewerId, Date.now()],
    });
  }

  const counts = await countsOf(post.id, viewerId);
  return { saved: counts.saved };
}

export async function addComment(viewer: Viewer, id: string, input: unknown) {
  const post = await requireVisible(id);
  const body = readText(input, MAX_COMMENT_BODY, "a comment", true);

  const commentId = makeId("c");

  await db().execute({
    sql: `INSERT INTO site_post_comments (id, post_id, user_id, body, created, deleted)
          VALUES (?, ?, ?, ?, ?, 0)`,
    args: [commentId, post.id, viewer.id, body, Date.now()],
  });

  const excerpt = body.slice(0, 140);

  // The author hears about the reply, and anyone named in it hears about
  // the mention — the same two rules a post follows.
  await recordMentions(post.id, viewer.id, body, excerpt);
  await notify({
    userId: post.author,
    actorId: viewer.id,
    kind: "comment",
    entityId: post.id,
    body: excerpt,
  });

  const counts = await countsOf(post.id, viewer.id);

  const comment: FeedComment = {
    id: commentId,
    author: {
      id: viewer.id,
      name: viewer.name,
      username: viewer.username,
      headline: viewer.headline,
      following: false,
    },
    body,
    created: Date.now(),
    mine: true,
  };

  return { comment, comments: counts.comments, postId: post.id, mentions: await mentionCards(body) };
}

/** Soft-deletes one of the viewer's own comments. */
export async function deleteComment(viewerId: string, commentId: string) {
  const id = readId(commentId, "That comment could not be found.");

  const result = await db().execute({
    sql: `UPDATE site_post_comments SET deleted = 1
          WHERE id = ? AND user_id = ? AND deleted = 0`,
    args: [id, viewerId],
  });

  if (!result.rowsAffected) throw new FeedError("That comment is not yours to delete.", 403);

  const found = await db().execute({
    sql: "SELECT post_id FROM site_post_comments WHERE id = ?",
    args: [id],
  });

  const postId = String(found.rows[0]?.post_id ?? "");
  const counts = postId ? await countsOf(postId, viewerId) : { comments: 0 };

  return { postId, comments: counts.comments };
}

export async function deletePost(viewerId: string, id: string) {
  const postId = readId(id);

  const result = await db().execute({
    sql: "UPDATE site_posts SET deleted = 1 WHERE id = ? AND user_id = ? AND deleted = 0",
    args: [postId, viewerId],
  });

  if (!result.rowsAffected) throw new FeedError("That post is not yours to delete.", 403);

  // The row has left the feed; take its stored photo and clip down with it.
  // Best effort — an unreachable blob must not undo the delete just made, and
  // a user-supplied external link is never touched.
  const media = await db().execute({
    sql: "SELECT image, video FROM site_posts WHERE id = ?",
    args: [postId],
  });
  const stored = media.rows[0]?.image;
  const clip = media.rows[0]?.video;
  await dropPostImage(typeof stored === "string" ? stored : null);
  await dropPostImage(typeof clip === "string" ? clip : null);

  return { id: postId };
}

/** Quote a post with an optional line of your own above it. */
export async function repost(viewer: Viewer, id: string, input: unknown) {
  const original = await requireVisible(id);
  const note = readText(input, MAX_REPOST_NOTE, "a thought", false);

  await ensureSchema();

  const newId = makeId("p");

  await db().execute({
    sql: `INSERT INTO site_posts
            (id, user_id, body, image, repost_of, audience, created, edited, deleted)
          VALUES (?, ?, ?, NULL, ?, 'anyone', ?, 0, 0)`,
    args: [newId, viewer.id, note, original.id, Date.now()],
  });

  await recordMentions(newId, viewer.id, note, note.slice(0, 140));
  await notify({
    userId: original.author,
    actorId: viewer.id,
    kind: "repost",
    entityId: newId,
    body: note.slice(0, 140),
  });

  const [post, counts] = await Promise.all([
    readPost(viewer, newId),
    countsOf(original.id, viewer.id),
  ]);

  if (!post) throw new FeedError("The repost could not be read back.", 503);

  return { post, reposts: counts.reposts };
}

/** Follow or unfollow one person. You cannot follow yourself. */
export async function setFollow(viewerId: string, targetId: string, follow: boolean) {
  const id = readId(targetId, "That person could not be found.");

  if (id === viewerId) throw new FeedError("You already have your own posts.");

  if (follow) {
    const person = await readPerson(id).catch(() => null);
    if (!person) throw new FeedError("That person could not be found.", 404);
  }

  await db().execute({
    sql: "DELETE FROM site_follows WHERE follower_id = ? AND followee_id = ?",
    args: [viewerId, id],
  });

  if (follow) {
    await db().execute({
      sql: "INSERT INTO site_follows (follower_id, followee_id, created) VALUES (?, ?, ?)",
      args: [viewerId, id, Date.now()],
    });

    await notify({
      userId: id,
      actorId: viewerId,
      kind: "follow",
      entityId: viewerId,
    });
  }

  return { following: follow };
}

// ------------------------------------------------------------------
//  Route helpers
// ------------------------------------------------------------------

/**
 * Same-origin check plus a JSON body. The cap is generous because a photo
 * rides in the body, and still small enough that a bad client cannot make
 * the handler read megabytes.
 */
export async function readFeedBody(request: Request) {
  sameOrigin(request);

  const cap = MAX_IMAGE_LENGTH + 200_000;

  if (Number(request.headers.get("content-length")) > cap) {
    throw new FeedError("That post is too large.", 413);
  }

  const raw = await request.text();
  if (raw.length > cap) throw new FeedError("That post is too large.", 413);

  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error();
    return data as Record<string, unknown>;
  } catch {
    throw new FeedError("Invalid request.");
  }
}

/** Turn a thrown error into the JSON shape every feed route returns. */
export function feedFailure(error: unknown) {
  if (error instanceof FeedError) {
    return Response.json(
      { error: error.message },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (error instanceof DatabaseError) {
    return Response.json(
      { error: "The feed is unavailable right now." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  console.error("Feed request failed", error);

  return Response.json(
    { error: "Could not do that. Please try again." },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
