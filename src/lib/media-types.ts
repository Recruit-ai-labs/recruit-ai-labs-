// ------------------------------------------------------------------
//  Profile pictures — the two a profile can carry.
//
//  Isomorphic on purpose: the picker in the browser and the routes on the
//  server have to agree on the kinds, the size budget and the address a
//  stored picture is read back from. Everything that needs a database
//  lives in ./media.ts instead.
//
//  The rows themselves go in `site_media`, which the older workspace at
//  D:\New folder already writes — `kind` is "cover" or "photo" and `data`
//  holds a whole data URL. Nothing here invents a second convention.
// ------------------------------------------------------------------

export const MEDIA_KINDS = ["photo", "cover"] as const;

export type MediaKind = (typeof MEDIA_KINDS)[number];

export function isMediaKind(value: unknown): value is MediaKind {
  return (
    typeof value === "string" && (MEDIA_KINDS as readonly string[]).includes(value)
  );
}

/** What the file picker offers and what the reader will serve. */
export const MEDIA_ACCEPT = "image/jpeg,image/png,image/webp";

/**
 * The most a data URL may weigh on its way to the route. A cover is the
 * expensive one: 1600px at quality 0.8 lands near 300KB, and the JSON
 * body adds a third on top of the base64.
 */
export const MAX_MEDIA_LENGTH = 900_000;

/** The longest edge each kind is re-encoded to before it is sent. */
export const MEDIA_MAX_EDGE: Record<MediaKind, number> = {
  photo: 720,
  cover: 1600,
};

export type MediaEntry = { kind: MediaKind; updated: number };

/** What a profile currently has. `null` means "not uploaded". */
export type ProfileMedia = Record<MediaKind, MediaEntry | null>;

export function emptyMedia(): ProfileMedia {
  return { photo: null, cover: null };
}

/**
 * The address a picture is read from.
 *
 * The version is the row's `updated` stamp, which is also what makes the
 * answer immutable: a new upload writes a new stamp, so the URL changes
 * and the browser fetches again instead of showing the old photograph.
 */
export function mediaUrl(userId: string, entry: MediaEntry | null) {
  if (!entry) return null;

  return `/api/media/${encodeURIComponent(userId)}/${entry.kind}?v=${entry.updated}`;
}
