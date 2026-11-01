// ------------------------------------------------------------------
//  The feed — the shape the browser and the server both agree on.
//
//  Types and formatting only: nothing here imports the database, so a
//  client component can hold a post and print it without dragging the
//  libSQL client into the bundle.
//
//  A post is deliberately flat. Everything a card needs to draw itself —
//  the author, the counts, whether *this* reader liked it, the two newest
//  comments — arrives in one object, so a card never fires five requests
//  to look finished.
// ------------------------------------------------------------------

export const MAX_POST_BODY = 3000;
export const MAX_COMMENT_BODY = 1000;
export const MAX_REPOST_NOTE = 1000;

/**
 * Roughly 675 KB of image once the browser has re-encoded it. The
 * composer downsizes before it uploads; this is the ceiling the route
 * enforces afterwards.
 */
export const MAX_IMAGE_LENGTH = 900_000;

/**
 * A clip's ceiling on its way to object storage. The browser streams the
 * file straight to Vercel Blob — never through a JSON body — so this only
 * bounds what the upload token will accept, not a request the API parses.
 */
export const MAX_VIDEO_BYTES = 50_000_000;

/** What the video picker offers and what a card will play. */
export const VIDEO_TYPES = ["video/mp4", "video/webm"] as const;
export const VIDEO_ACCEPT = VIDEO_TYPES.join(",");

export const AUDIENCES = ["anyone", "followers"] as const;

export type Audience = (typeof AUDIENCES)[number];

/**
 * The five reactions, in the order the picker prints them.
 *
 * The reaction table always carried a `kind` column and the code only ever
 * wrote 'like' into it — this list is the rest of the promise being kept.
 * The order matters twice over: it is the left-to-right order of the picker
 * and the priority when a summary has to show fewer kinds than there are.
 */
export const REACTION_KINDS = [
  "like",
  "celebrate",
  "support",
  "insight",
  "love",
] as const;

export type ReactionKind = (typeof REACTION_KINDS)[number];

/** The word a card prints for one reaction. */
export const REACTION_LABELS: Record<ReactionKind, string> = {
  like: "Like",
  celebrate: "Celebrate",
  support: "Support",
  insight: "Insight",
  love: "Love",
};

/**
 * A body straight from a request is allowed to claim anything. A reaction
 * is one of five words or it is nothing, and this is the only door the
 * routes use to tell the two apart.
 */
export function isReactionKind(value: unknown): value is ReactionKind {
  return (
    typeof value === "string" &&
    (REACTION_KINDS as readonly string[]).includes(value)
  );
}

export type FeedAuthor = {
  id: string;
  name: string;
  username: string;
  headline: string;
  /** Whether the person reading follows this author. */
  following: boolean;
};

export type FeedComment = {
  id: string;
  author: FeedAuthor;
  body: string;
  created: number;
  mine: boolean;
};

/**
 * Someone a post names with @username.
 *
 * Carried alongside the body rather than parsed in the browser: the server
 * is the only side that can turn a username into an id, and a link that
 * guesses would 404 on every renamed account.
 */
export type FeedMention = {
  id: string;
  username: string;
  name: string;
};

/** The original a repost is quoting. */
export type FeedQuote = {
  id: string;
  author: FeedAuthor;
  body: string;
  image: string | null;
  created: number;
};

export type FeedPost = {
  id: string;
  author: FeedAuthor;
  body: string;
  image: string | null;
  /**
   * A short clip's public storage URL, or null. When present the card plays
   * a <video>; `image` then doubles as its poster frame.
   */
  video: string | null;
  audience: Audience;
  created: number;
  edited: boolean;
  mine: boolean;
  likes: number;
  comments: number;
  reposts: number;
  /** Any reaction at all — the count line only needs this much. */
  liked: boolean;
  /**
   * The reader's own reaction, or null when they have not reacted.
   *
   * `liked` is this field seen from further away: a card paints the reader's
   * chosen glyph from `reaction`, and everything that only needs to know
   * whether they reacted at all keeps reading `liked`.
   */
  reaction: ReactionKind | null;
  saved: boolean;
  /** The post this one quotes; null on an original. */
  quote: FeedQuote | null;
  /** The two newest comments, so a card is never blank under its actions. */
  preview: FeedComment[];
  /** Everyone named in the body or its comments, resolved for linking. */
  mentions: FeedMention[];
};

export type FeedFilter = "for-you" | "following" | "saved";

export type FeedPage = {
  posts: FeedPost[];
  /** Send back as `before` to continue; null when the list is exhausted. */
  cursor: number | null;
};

export type FeedActivity = {
  posts: number;
  reactions: number;
  comments: number;
  followers: number;
};

/** The signed-in reader, as the composer and the comment box print them. */
export type FeedViewer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  headline: string;
  /** The uploaded portrait's address, when there is one. */
  photo?: string | null;
};

/** "First Last", trimmed — the same rule the mirror table uses. */
export function fullName(viewer: { firstName: string; lastName: string }) {
  return `${viewer.firstName} ${viewer.lastName}`.trim();
}

/**
 * Two initials from a full name. Split here rather than in every card so
 * "Aadil Hussain" and "Aadil" never produce different discs.
 */
export function initialsOfName(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";

  return `${words[0].charAt(0)}${words[1]?.charAt(0) ?? ""}`.toUpperCase();
}

/** The shape PersonAvatar wants, built from a feed author's full name. */
export function avatarOf(name: string) {
  return { firstName: "", lastName: "", name };
}

/**
 * A timestamp as a reader says it: "now", "4m", "2h", "3d", then a date.
 * Rounded down so a post never claims to be older than it is.
 */
export function timeAgo(created: number, now = Date.now()) {
  const seconds = Math.max(0, Math.floor((now - created) / 1000));

  if (seconds < 45) return "now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${Math.max(1, minutes)}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;

  const date = new Date(created);
  const sameYear = date.getFullYear() === new Date(now).getFullYear();

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/** "3 comments" / "1 like" — the small plural rule the counts row needs. */
export function plural(count: number, one: string, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`;
}
