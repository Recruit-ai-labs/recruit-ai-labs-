// ------------------------------------------------------------------
//  Connections, messages and notifications — the shape both sides agree
//  on.
//
//  Types only, exactly like feed-types.ts: a client component can hold a
//  conversation or an invitation without dragging the database client into
//  the bundle. The server modules (network.ts, messages.ts,
//  notifications.ts) build these and the routes hand them over untouched.
//
//  One decision runs through all three: a person is always a `PersonCard`,
//  never a bare id. A row that names someone can then draw their face, their
//  headline and their link without a second request per row.
// ------------------------------------------------------------------

export const MAX_MESSAGE_BODY = 2000;
export const MAX_MESSAGE_PREVIEW = 140;

/**
 * The line a person may add when they invite someone to connect.
 *
 * LinkedIn caps this at a short note rather than a message, and so do we:
 * it rides along on the invitation notification, where the excerpt is
 * already clipped to `MAX_MESSAGE_PREVIEW`, but a sender should be able to
 * say a full sentence before it is trimmed. Kept small on purpose — an
 * invitation is a knock on the door, not a letter.
 */
export const MAX_INVITE_NOTE = 300;

/** The short version of a profile, printed wherever a name appears. */
export type PersonCard = {
  id: string;
  name: string;
  username: string;
  headline: string;
  /** The uploaded portrait, already addressed. Null means initials. */
  photo: string | null;
  city: string;
  /** How many of the reader's connections know this person. */
  mutual: number;
};

/** Where the reader stands with one person. */
export type ConnectionState =
  | "self"
  | "none"
  | "outgoing"
  | "incoming"
  | "connected";

export type NetworkCounts = {
  connections: number;
  incoming: number;
  outgoing: number;
  followers: number;
  following: number;
};

/** Everything /seeker/network prints, read in one pass. */
export type NetworkOverview = {
  counts: NetworkCounts;
  /** Invitations waiting on the reader. */
  invitations: PersonCard[];
  /** Invitations the reader sent that are still pending. */
  outgoing: PersonCard[];
  connections: PersonCard[];
  /** Second-degree people, best first. */
  suggestions: PersonCard[];
};

/** One section of the public profile's history. */
export type PublicExperience = {
  title: string;
  company: string;
  employmentType: string;
  location: string;
  start: string;
  end: string;
  current: boolean;
  description: string;
};

export type PublicEducation = {
  college: string;
  course: string;
  speciality: string;
  startYear: string;
  endYear: string;
  current: boolean;
  grade: string;
};

export type PublicSkill = {
  name: string;
  level: string;
};

/**
 * Someone else's profile as the reader is allowed to see it.
 *
 * `locked` is the whole point: until the reader follows or connects, the
 * detail is never sent to the browser at all. The page draws the cover, the
 * face, the headline and the counters, and asks for one of the two moves
 * that open the rest.
 */
export type PublicProfile = {
  person: PersonCard;
  /** The uploaded cover, or null for the drawn one. */
  cover: string | null;
  state: ConnectionState;
  following: boolean;
  locked: boolean;
  counts: { connections: number; followers: number; posts: number };
  /** Connections the reader and this person share. */
  mutual: PersonCard[];
  about: string;
  experience: PublicExperience[];
  education: PublicEducation[];
  skills: PublicSkill[];
  links: { website: string; linkedin: string; github: string };
};

/**
 * One person who has opened your profile.
 *
 * `seen` is their most recent visit, not the first: the list answers "who is
 * reading me right now", and a person who looked twice is one row with the
 * newest stamp. `visits` says how many times they came back.
 */
export type ProfileViewer = {
  person: PersonCard;
  seen: number;
  visits: number;
};

/** Everything the profile-viewers page and the home rail need. */
export type ProfileViewSummary = {
  /** Every visit, repeats included — the number a member reads as "views". */
  views: number;
  /** Distinct members. Smaller than `views` as soon as anyone comes back. */
  readers: number;
  people: ProfileViewer[];
};

export type ChatMessage = {
  id: string;
  body: string;
  created: number;
  mine: boolean;
  /**
   * The other side has read this one.
   *
   * Only meaningful on a message you sent — `read_at` is stamped by the
   * recipient when they open the thread, so on an incoming row it would say
   * "you read it", which nobody needs told. A thread that polls itself picks
   * this up without a new row, which is why it travels per message rather
   * than as one flag on the conversation.
   */
  seen: boolean;
};

/** One row of the inbox: who it was with, and where it left off. */
export type Conversation = {
  person: PersonCard;
  last: string;
  lastAt: number;
  unread: number;
  /** True when the last word was the reader's. */
  mine: boolean;
};

export type ConversationThread = {
  person: PersonCard;
  messages: ChatMessage[];
  /** Unread rows from the other side, read before they are marked. */
  unread: number;
};

export type NotificationKind =
  | "follow"
  | "connection"
  | "connection-accepted"
  | "message"
  | "mention"
  | "like"
  | "comment"
  | "repost";

export type SocialNotification = {
  id: string;
  kind: NotificationKind;
  actor: PersonCard;
  /** One line the actor did, already phrased for the reader. */
  text: string;
  /** An excerpt, for messages, mentions and comments. */
  excerpt: string;
  /** Where the row goes when clicked. */
  href: string;
  created: number;
  unread: boolean;
};

/** The three numbers the bar's badges print. */
export type SocialBadges = {
  messages: number;
  notifications: number;
  invitations: number;
};

export function emptyBadges(): SocialBadges {
  return { messages: 0, notifications: 0, invitations: 0 };
}
