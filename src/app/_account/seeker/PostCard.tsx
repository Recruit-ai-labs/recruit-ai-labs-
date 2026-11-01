"use client";

import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

import {
  MAX_COMMENT_BODY,
  MAX_POST_BODY,
  REACTION_KINDS,
  REACTION_LABELS,
  plural,
  timeAgo,
  type FeedComment,
  type FeedMention,
  type FeedPost,
  type FeedViewer,
  type ReactionKind,
} from "@/lib/feed-types";

import {
  BookmarkIcon,
  CelebrateIcon,
  CheckIcon,
  CloseIcon,
  CommentIcon,
  GlobeIcon,
  InsightIcon,
  LikeIcon,
  LinkIcon,
  LoveIcon,
  MoreIcon,
  PencilIcon,
  RepostIcon,
  SendIcon,
  SupportIcon,
  TrashIcon,
  UsersIcon,
} from "./Icons";
import PersonAvatar from "./PersonAvatar";
import ShareDialog from "./ShareDialog";
import styles from "./seeker.module.scss";
import useOverlay from "./useOverlay";

// ------------------------------------------------------------------
//  One post.
//
//  The card is the whole product in miniature, so it behaves the way a
//  reader expects rather than the way it is easiest to build:
//
//  · a like lands in the same frame as the click and is corrected by the
//    server's answer, not by a refresh;
//  · comments ship with the two newest, and the rest are one click away;
//  · the header's Follow and the action bar's Repost both write through
//    the same routes, so a card is never a display of stale numbers;
//  · every destructive action asks once, inside the menu that offered it;
//  · the author can rewrite their own words without losing the post's place
//    in time — the card keeps its timestamp and says it was edited.
// ------------------------------------------------------------------

type Busy = "like" | "save" | "follow" | "delete" | "edit" | null;

type PendingComment = FeedComment & { pending?: boolean };

type Props = {
  post: FeedPost;
  viewer: FeedViewer;
  onPatch: (id: string, patch: Partial<FeedPost>) => void;
  onRemove: (id: string) => void;
  onFollow: (authorId: string, following: boolean) => void;
  onReposted: (post: FeedPost) => void;
};

const QUOTE_PREVIEW = 220;

/**
 * The glyph a reaction paints, in the picker and on the button.
 *
 * A record keyed by the kind rather than a chain of ternaries, because the
 * same five names appear in two places on the card and they must not drift.
 */
const REACTION_ICONS: Record<ReactionKind, ComponentType<{ className?: string }>> = {
  like: LikeIcon,
  celebrate: CelebrateIcon,
  support: SupportIcon,
  insight: InsightIcon,
  love: LoveIcon,
};

function message(problem: unknown) {
  return problem instanceof Error ? problem.message : "That did not go through.";
}

function avatar(name: string) {
  return { firstName: "", lastName: "", name };
}

/**
 * Plain text, with links that open in a new tab, tags that read as tags,
 * and @mentions that point at the person they name.
 *
 * Mention links are resolved from the post's stored mentions rather than
 * from the text alone: a word that happens to follow an at-sign should
 * not become a link to somebody who was never mentioned.
 */
function RichText({ text, mentions = [] }: { text: string; mentions?: FeedMention[] }) {
  const people = new Map(mentions.map((one) => [one.username.toLowerCase(), one]));
  const parts = text.split(
    /(https?:\/\/[^\s<>"]+|@[a-z][a-z0-9_]{2,29}|#[\p{L}\p{N}_]{2,})/gu,
  );

  return (
    <>
      {parts.map((part, index) => {
        if (/^https?:\/\//i.test(part)) {
          return (
            <a
              key={index}
              className={styles.postLink}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
            >
              {part}
            </a>
          );
        }

        if (part.startsWith("@")) {
          const person = people.get(part.slice(1).toLowerCase());
          if (!person) return <Fragment key={index}>{part}</Fragment>;

          return (
            <Link
              key={index}
              className={styles.postMention}
              href={`/seeker/people/${person.id}`}
            >
              {part}
            </Link>
          );
        }

        if (/^#[\p{L}\p{N}_]{2,}$/u.test(part)) {
          return (
            <span key={index} className={styles.tag}>
              {part}
            </span>
          );
        }

        return <Fragment key={index}>{part}</Fragment>;
      })}
    </>
  );
}

export default function PostCard({
  post,
  viewer,
  onPatch,
  onRemove,
  onFollow,
  onReposted,
}: Props) {
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // An edit is an inline mode, not a dialog: the words change where they
  // already are, which is what makes a corrected post feel like the same post.
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const [shareOpen, setShareOpen] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [flash, setFlash] = useState(false);

  const [threadOpen, setThreadOpen] = useState(false);
  const [thread, setThread] = useState<PendingComment[] | null>(null);
  const [threadLoaded, setThreadLoaded] = useState(false);
  const [threadBusy, setThreadBusy] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);

  // The reaction picker is one small popover owned by the Like button. It
  // opens on a held hover (desktop) or a long press (touch), and a plain
  // click never waits for it — a tap is still the fastest possible Like.
  const [pickerOpen, setPickerOpen] = useState(false);
  const reactionWrap = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<number | null>(null);
  const pressTimer = useRef<number | null>(null);
  // A long press that opened the picker must not also fire the click that
  // follows the release, or every picker would start on Like.
  const pressed = useRef(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const commentBox = useRef<HTMLTextAreaElement>(null);
  const editBox = useRef<HTMLTextAreaElement>(null);

  // A permalink is `/seeker#post-<id>`; the card it names answers.
  useEffect(() => {
    if (window.location.hash !== `#post-${post.id}`) return;

    const scroll = window.setTimeout(() => {
      document.getElementById(`post-${post.id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      setFlash(true);
    }, 140);

    const settle = window.setTimeout(() => setFlash(false), 2800);

    return () => {
      window.clearTimeout(scroll);
      window.clearTimeout(settle);
    };
  }, [post.id]);

  useEffect(() => {
    if (!menuOpen) return;

    function onPointerDown(event: PointerEvent) {
      if (menuRef.current?.contains(event.target as Node)) return;
      setMenuOpen(false);
      setConfirmingDelete(false);
    }

    document.addEventListener("pointerdown", onPointerDown);

    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  useEffect(() => {
    if (!linkCopied) return;
    const timer = window.setTimeout(() => setLinkCopied(false), 2200);
    return () => window.clearTimeout(timer);
  }, [linkCopied]);

  // Opening the editor puts the caret at the end of the existing words and
  // grows the box to fit them, so the first keystroke is a correction rather
  // than a scroll hunt.
  useEffect(() => {
    if (!editing) return;

    const box = editBox.current;
    if (!box) return;

    box.focus();
    box.setSelectionRange(box.value.length, box.value.length);
  }, [editing]);

  useOverlay(lightbox, () => setLightbox(false));

  async function send<T>(payload: Record<string, unknown>): Promise<T> {
    const response = await fetch(`/api/posts/${post.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) throw new Error(data.error ?? "That did not go through.");

    return data as T;
  }

  // A click anywhere outside the picker closes it, the same bargain the post
  // menu keeps. The picker is not a modal; it must not trap a tap meant for
  // the rest of the card.
  useEffect(() => {
    if (!pickerOpen) return;

    function onPointerDown(event: PointerEvent) {
      if (reactionWrap.current?.contains(event.target as Node)) return;
      setPickerOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);

    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [pickerOpen]);

  // Any pending timer dies with the card, so a hover that never finished
  // cannot pop the picker open after the post scrolls away.
  useEffect(
    () => () => {
      if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
      if (pressTimer.current) window.clearTimeout(pressTimer.current);
    },
    [],
  );

  /**
   * The single write behind every reaction move.
   *
   * `kind` is what to leave on the post, or null to take it back. The card
   * paints the answer before the round trip finishes — the button glows the
   * instant it is pressed — and then bows to whatever the server read back.
   */
  async function react(next: ReactionKind | null) {
    if (busy) return;

    const had = post.reaction !== null;
    const delta = next === null ? (had ? -1 : 0) : had ? 0 : 1;

    setBusy("like");
    setError("");
    onPatch(post.id, {
      reaction: next,
      liked: next !== null,
      likes: Math.max(0, post.likes + delta),
    });

    try {
      const data = await send<{ likes: number; liked: boolean; reaction: ReactionKind | null }>({
        action: "react",
        kind: next,
      });

      onPatch(post.id, { likes: data.likes, liked: data.liked, reaction: data.reaction });
    } catch (problem) {
      // The press was a guess about the server. Put the card back exactly
      // as it was rather than to a half-truth.
      onPatch(post.id, { reaction: post.reaction, liked: post.liked, likes: post.likes });
      setError(message(problem));
    } finally {
      setBusy(null);
    }
  }

  /**
   * The plain tap on the button itself.
   *
   * No reaction yet leaves a Like; any reaction already there is taken back,
   * whichever kind it was — pressing the glowing heart once more is the
   * obvious way to stop loving a post.
   */
  function tapReaction() {
    if (pressed.current) {
      pressed.current = false;
      return;
    }

    void react(post.reaction ? null : "like");
  }

  function pickReaction(kind: ReactionKind) {
    setPickerOpen(false);
    void react(kind);
  }

  // Desktop: hold the pointer over the button a beat and the picker rises.
  function openOnHover() {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);

    hoverTimer.current = window.setTimeout(() => setPickerOpen(true), 350);
  }

  function cancelHover() {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
  }

  // Touch: press and hold. A short press must stay a Like, so the picker is
  // on a timer that a quick release clears before it fires.
  function openOnPress() {
    pressTimer.current = window.setTimeout(() => {
      pressed.current = true;
      setPickerOpen(true);
    }, 400);
  }

  function cancelPress() {
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
  }

  async function toggleSave() {
    if (busy) return;

    const next = !post.saved;
    setBusy("save");
    setError("");
    onPatch(post.id, { saved: next });

    try {
      const data = await send<{ saved: boolean }>({ action: next ? "save" : "unsave" });
      onPatch(post.id, { saved: data.saved });
    } catch (problem) {
      onPatch(post.id, { saved: post.saved });
      setError(message(problem));
    } finally {
      setBusy(null);
    }
  }

  async function toggleFollow() {
    if (busy) return;

    const next = !post.author.following;
    setBusy("follow");
    setError("");
    onFollow(post.author.id, next);

    try {
      const response = await fetch(`/api/people/${post.author.id}/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ follow: next }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        following?: boolean;
        error?: string;
      };

      if (!response.ok) throw new Error(data.error ?? "That did not go through.");

      onFollow(post.author.id, data.following ?? next);
    } catch (problem) {
      onFollow(post.author.id, post.author.following);
      setError(message(problem));
    } finally {
      setBusy(null);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/seeker#post-${post.id}`,
      );
      setLinkCopied(true);
      setMenuOpen(false);
    } catch {
      setError("This browser would not let the link be copied.");
    }
  }

  /** Put the card's own words into the caret, in place. */
  function startEdit() {
    setMenuOpen(false);
    setConfirmingDelete(false);
    setError("");
    setDraft(post.body);
    setEditing(true);
  }

  /**
   * Send the rewrite and take the server's refreshed card.
   *
   * An unchanged body is a cancel, not a write: stamping "Edited" on words
   * that never moved would make the card lie about having been touched.
   */
  async function saveEdit() {
    const body = draft.trim();

    if (!body && !post.image) {
      setError("Write something, or keep the photo's caption.");
      return;
    }

    if (body === post.body) {
      setEditing(false);
      return;
    }

    setBusy("edit");
    setError("");

    try {
      const data = await send<{ post: FeedPost }>({ action: "edit", body });

      // The full post comes back because three things moved at once: the
      // words, the "Edited" stamp and the people the new text names.
      onPatch(post.id, {
        body: data.post.body,
        edited: true,
        mentions: data.post.mentions,
      });
      setExpanded(true);
      setEditing(false);
    } catch (problem) {
      setError(message(problem));
    } finally {
      setBusy(null);
    }
  }

  async function removePost() {
    setBusy("delete");
    setError("");

    try {
      await send({ action: "delete" });
      onRemove(post.id);
    } catch (problem) {
      setError(message(problem));
      setBusy(null);
    }
  }

  async function openThread() {
    setThreadOpen(true);
    setError("");

    if (threadLoaded || threadBusy || post.comments === 0) {
      window.setTimeout(() => commentBox.current?.focus(), 60);
      return;
    }

    setThreadBusy(true);

    try {
      const response = await fetch(`/api/posts/${post.id}/comments`, {
        cache: "no-store",
      });

      const data = (await response.json().catch(() => ({}))) as {
        comments?: FeedComment[];
        error?: string;
      };

      if (!response.ok) throw new Error(data.error ?? "Comments could not be loaded.");

      setThread(data.comments ?? []);
      setThreadLoaded(true);
    } catch (problem) {
      setError(message(problem));
    } finally {
      setThreadBusy(false);
    }
  }

  async function submitComment(event?: FormEvent) {
    event?.preventDefault();

    const body = commentText.trim();
    if (!body || sending) return;

    const temporary: PendingComment = {
      id: `temp-${Date.now()}`,
      author: {
        id: viewer.id,
        name: `${viewer.firstName} ${viewer.lastName}`.trim() || "You",
        username: viewer.username,
        headline: viewer.headline,
        following: false,
      },
      body,
      created: Date.now(),
      mine: true,
      pending: true,
    };

    setThread((current) => [...(current ?? post.preview), temporary]);
    setThreadOpen(true);
    setCommentText("");
    setSending(true);
    setError("");

    try {
      const data = await send<{ comment: FeedComment; comments: number }>({
        action: "comment",
        body,
      });

      setThread((current) =>
        (current ?? []).map((entry) => (entry.id === temporary.id ? data.comment : entry)),
      );
      onPatch(post.id, { comments: data.comments });
    } catch (problem) {
      setThread((current) => (current ?? []).filter((entry) => entry.id !== temporary.id));
      setCommentText(body);
      setError(message(problem));
    } finally {
      setSending(false);
    }
  }

  async function removeComment(id: string) {
    setThread((current) => (current ?? []).filter((entry) => entry.id !== id));
    onPatch(post.id, { comments: Math.max(0, post.comments - 1) });

    try {
      const data = await send<{ comments: number }>({
        action: "comment-delete",
        commentId: id,
      });
      onPatch(post.id, { comments: data.comments });
    } catch (problem) {
      setError(message(problem));
    }
  }

  const long = post.body.length > 520 || post.body.split("\n").length > 8;
  // The thread is `PendingComment[]` so a row that has not reached the
  // server yet can say so without widening the shared type.
  const shown: PendingComment[] = thread ?? post.preview;
  const headline = post.author.headline || (post.author.username ? `@${post.author.username}` : "");
  const quoteAvatar = post.quote ? avatar(post.quote.author.name) : null;

  // The button wears the reader's own glyph once they have chosen, and the
  // thumb until then — computed here so the picker above and the button
  // below read one value rather than two.
  const ActiveIcon = post.reaction ? REACTION_ICONS[post.reaction] : LikeIcon;

  return (
    <article
      id={`post-${post.id}`}
      className={flash ? `${styles.post} ${styles.postFlash}` : styles.post}
      aria-labelledby={`post-name-${post.id}`}
    >
      <header className={styles.postHead}>
        <PersonAvatar person={avatar(post.author.name)} className={styles.postAvatar} />

        <div className={styles.postIdentity}>
          <p className={styles.postNameRow}>
            <strong className={styles.postName} id={`post-name-${post.id}`}>
              {post.author.name}
            </strong>

            {post.mine ? <span className={styles.postBadge}>You</span> : null}

            {!post.mine ? (
              <button
                type="button"
                className={post.author.following ? styles.postFollowing : styles.postFollow}
                onClick={() => void toggleFollow()}
                disabled={busy === "follow"}
              >
                {post.author.following ? "Following" : "Follow"}
              </button>
            ) : null}
          </p>

          {headline ? <p className={styles.postHeadline}>{headline}</p> : null}

          <p className={styles.postMeta}>
            <time dateTime={new Date(post.created).toISOString()}>{timeAgo(post.created)}</time>
            <span aria-hidden="true">·</span>
            {post.audience === "followers" ? (
              <UsersIcon className={styles.postMetaIcon} />
            ) : (
              <GlobeIcon className={styles.postMetaIcon} />
            )}
            <span className={styles.srOnly}>
              {post.audience === "followers" ? "Visible to followers" : "Visible to anyone"}
            </span>
            {post.edited ? (
              <>
                <span aria-hidden="true">·</span>
                <span>Edited</span>
              </>
            ) : null}
          </p>
        </div>

        <div className={styles.postMenuWrap} ref={menuRef}>
          <button
            type="button"
            className={styles.menuButton}
            aria-label="Post options"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MoreIcon className={styles.menuIcon} />
          </button>

          {menuOpen ? (
            <div className={styles.menu} role="menu" aria-label="Post options">
              <button type="button" role="menuitem" className={styles.menuItem} onClick={() => void copyLink()}>
                {linkCopied ? (
                  <CheckIcon className={styles.menuItemIcon} />
                ) : (
                  <LinkIcon className={styles.menuItemIcon} />
                )}
                {linkCopied ? "Link copied" : "Copy link to post"}
              </button>

              <button
                type="button"
                role="menuitem"
                className={styles.menuItem}
                onClick={() => {
                  setMenuOpen(false);
                  void toggleSave();
                }}
              >
                <BookmarkIcon className={styles.menuItemIcon} />
                {post.saved ? "Remove from saved" : "Save post"}
              </button>

              {post.mine && !editing ? (
                <button
                  type="button"
                  role="menuitem"
                  className={styles.menuItem}
                  onClick={startEdit}
                >
                  <PencilIcon className={styles.menuItemIcon} />
                  Edit post
                </button>
              ) : null}

              {post.mine ? (
                confirmingDelete ? (
                  <div className={styles.menuConfirm}>
                    <p className={styles.menuConfirmText}>
                      Delete this post? Anyone who reposted it will see that it is gone.
                    </p>
                    <div className={styles.menuConfirmActions}>
                      <button
                        type="button"
                        className={styles.menuDanger}
                        onClick={() => void removePost()}
                        disabled={busy === "delete"}
                      >
                        {busy === "delete" ? "Deleting…" : "Delete"}
                      </button>
                      <button
                        type="button"
                        className={styles.menuCancel}
                        onClick={() => setConfirmingDelete(false)}
                      >
                        Keep it
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    className={styles.menuDanger}
                    onClick={() => setConfirmingDelete(true)}
                  >
                    <TrashIcon className={styles.menuItemIcon} />
                    Delete post
                  </button>
                )
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      {editing ? (
        <div className={styles.postEdit}>
          <textarea
            ref={editBox}
            className={styles.postEditArea}
            value={draft}
            rows={Math.min(12, Math.max(4, draft.split("\n").length + 1))}
            maxLength={MAX_POST_BODY}
            aria-label="Edit your post"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              // Escape gives the words back as they were; Enter on its own
              // still writes a line break, because a post is prose.
              if (event.key !== "Escape") return;

              event.preventDefault();
              setEditing(false);
            }}
          />

          <div className={styles.postEditActions}>
            <span className={styles.postEditCount}>
              {plural(draft.trim().length, "character")} of {MAX_POST_BODY}
            </span>

            <button
              type="button"
              className={styles.postEditCancel}
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.postEditSave}
              onClick={() => void saveEdit()}
              disabled={busy === "edit" || draft.trim() === post.body}
            >
              {busy === "edit" ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      ) : post.body ? (
        <>
          <p className={long && !expanded ? styles.postBodyClamp : styles.postBody}>
            <RichText text={post.body} mentions={post.mentions} />
          </p>
          {long ? (
            <button
              type="button"
              className={styles.seeMore}
              onClick={() => setExpanded((open) => !open)}
            >
              {expanded ? "See less" : "See more"}
            </button>
          ) : null}
        </>
      ) : null}

      {post.video ? (
        <div className={styles.videoMedia}>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            className={styles.postVideo}
            src={post.video}
            poster={post.image ?? undefined}
            controls
            playsInline
            preload="metadata"
          />
        </div>
      ) : post.image ? (
        <button
          type="button"
          className={styles.imageButton}
          onClick={() => setLightbox(true)}
          aria-label="Open photo"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.image} alt="" className={styles.postImage} loading="lazy" />
        </button>
      ) : null}

      {post.quote ? (
        <figure className={styles.quote}>
          <div className={styles.quoteHead}>
            {quoteAvatar ? <PersonAvatar person={quoteAvatar} /> : null}
            <div className={styles.quoteIdentity}>
              <strong className={styles.quoteName}>{post.quote.author.name}</strong>
              {post.quote.author.headline ? (
                <span className={styles.quoteHeadline}>{post.quote.author.headline}</span>
              ) : null}
            </div>
          </div>

          {post.quote.body ? (
            <p className={styles.quoteBody}>
              {post.quote.body.length > QUOTE_PREVIEW
                ? `${post.quote.body.slice(0, QUOTE_PREVIEW)}…`
                : post.quote.body}
            </p>
          ) : null}

          {post.quote.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.quote.image} alt="" className={styles.quoteImage} loading="lazy" />
          ) : null}
        </figure>
      ) : null}

      {post.likes || post.comments || post.reposts ? (
        <div className={styles.postCounts}>
          <span>
            {post.likes ? plural(post.likes, "reaction", "reactions") : ""}
          </span>
          <span>{post.comments ? plural(post.comments, "comment") : ""}</span>
          <span>{post.reposts ? plural(post.reposts, "repost") : ""}</span>
        </div>
      ) : null}

      <div className={styles.postActions}>
        {/* One wrapper owns the hover, the long press and the dismiss test,
            because the picker counts as part of the button for all three. */}
        <div
          className={styles.reactionWrap}
          ref={reactionWrap}
          onMouseEnter={openOnHover}
          onMouseLeave={cancelHover}
        >
          {pickerOpen ? (
            <div className={styles.reactionPicker} role="group" aria-label="Choose a reaction">
              {REACTION_KINDS.map((kind) => {
                const Option = REACTION_ICONS[kind];
                const chosen = post.reaction === kind;

                return (
                  <button
                    key={kind}
                    type="button"
                    className={chosen ? `${styles.reactionPick} ${styles.reactionPickOn}` : styles.reactionPick}
                    onClick={() => pickReaction(kind)}
                    // Each option keeps the picker alive while the pointer
                    // moves onto it — the wrapper's leave handler would
                    // otherwise cancel a hover that is only visiting.
                    onMouseEnter={cancelHover}
                    aria-pressed={chosen}
                    title={REACTION_LABELS[kind]}
                  >
                    <Option className={styles.reactionPickIcon} />
                    <span className={styles.reactionPickLabel}>{REACTION_LABELS[kind]}</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          <button
            type="button"
            className={post.liked ? `${styles.action} ${styles.actionActive}` : styles.action}
            onClick={tapReaction}
            onPointerDown={openOnPress}
            onPointerUp={cancelPress}
            onPointerLeave={cancelPress}
            onContextMenu={(event) => {
              // A desktop right-click opens the picker instead of the
              // browser's menu — the same shortcut LinkedIn answers with.
              event.preventDefault();
              setPickerOpen((open) => !open);
            }}
            aria-pressed={post.liked}
            aria-haspopup="true"
            aria-expanded={pickerOpen}
          >
            <ActiveIcon className={styles.actionIcon} />
            <span className={styles.actionLabel}>
              {post.reaction ? REACTION_LABELS[post.reaction] : "Like"}
            </span>
          </button>
        </div>

        <button
          type="button"
          className={threadOpen ? `${styles.action} ${styles.actionOpen}` : styles.action}
          onClick={() => void openThread()}
          aria-expanded={threadOpen}
        >
          <CommentIcon className={styles.actionIcon} />
          <span className={styles.actionLabel}>Comment</span>
        </button>

        <button type="button" className={styles.action} onClick={() => setShareOpen(true)}>
          <RepostIcon className={styles.actionIcon} />
          <span className={styles.actionLabel}>Repost</span>
        </button>

        <button type="button" className={styles.action} onClick={() => void copyLink()}>
          {linkCopied ? (
            <CheckIcon className={styles.actionIcon} />
          ) : (
            <SendIcon className={styles.actionIcon} />
          )}
          <span className={styles.actionLabel}>{linkCopied ? "Copied" : "Share"}</span>
        </button>

        <button
          type="button"
          className={post.saved ? `${styles.saveAction} ${styles.saveActive}` : styles.saveAction}
          onClick={() => void toggleSave()}
          aria-pressed={post.saved}
          aria-label={post.saved ? "Remove from saved posts" : "Save this post"}
          title={post.saved ? "Remove from saved" : "Save this post"}
        >
          <BookmarkIcon className={styles.actionIcon} />
        </button>
      </div>

      {error ? (
        <p className={styles.cardError} role="alert">
          {error}
          <button type="button" className={styles.cardErrorClose} onClick={() => setError("")}>
            Dismiss
          </button>
        </p>
      ) : null}

      {threadOpen ? (
        <section className={styles.thread} aria-label="Comments">
          {post.comments > shown.length && !threadLoaded ? (
            <button
              type="button"
              className={styles.threadMore}
              onClick={() => void openThread()}
              disabled={threadBusy}
            >
              {threadBusy ? "Loading comments…" : `View all ${plural(post.comments, "comment")}`}
            </button>
          ) : null}

          <ul className={styles.commentList}>
            {shown.map((entry) => (
              <li className={styles.comment} key={entry.id}>
                <PersonAvatar person={avatar(entry.author.name)} />

                <div className={styles.commentBubble}>
                  <div className={styles.commentHead}>
                    <strong className={styles.commentName}>{entry.author.name}</strong>
                    {entry.author.headline ? (
                      <span className={styles.commentHeadline}>{entry.author.headline}</span>
                    ) : null}
                  </div>

                  <p className={styles.commentBody}>{entry.body}</p>

                  <div className={styles.commentMeta}>
                    <time dateTime={new Date(entry.created).toISOString()}>
                      {entry.pending ? "Sending…" : timeAgo(entry.created)}
                    </time>
                    {entry.mine && !entry.pending ? (
                      <button
                        type="button"
                        className={styles.commentDelete}
                        onClick={() => void removeComment(entry.id)}
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <form className={styles.commentForm} onSubmit={(event) => void submitComment(event)}>
            <PersonAvatar
              person={{
                firstName: viewer.firstName,
                lastName: viewer.lastName,
                email: viewer.email,
              }}
              src={viewer.photo}
            />

            <textarea
              ref={commentBox}
              className={styles.commentInput}
              value={commentText}
              rows={1}
              maxLength={MAX_COMMENT_BODY}
              placeholder="Add a comment…"
              aria-label="Write a comment"
              onChange={(event) => setCommentText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.shiftKey) return;

                event.preventDefault();
                void submitComment();
              }}
            />

            <button
              type="submit"
              className={styles.commentSend}
              disabled={!commentText.trim() || sending}
            >
              {sending ? "…" : "Post"}
            </button>
          </form>
        </section>
      ) : null}

      {shareOpen ? (
        <ShareDialog
          post={post}
          onClose={() => setShareOpen(false)}
          onReposted={onReposted}
          onRepostCount={(count) => onPatch(post.id, { reposts: count })}
        />
      ) : null}

      {lightbox && post.image
        ? createPortal(
            <div className={styles.overlay}>
              <button
                type="button"
                className={styles.backdrop}
                aria-label="Close photo"
                onClick={() => setLightbox(false)}
              />

              <div className={styles.lightbox} role="dialog" aria-modal="true" aria-label="Photo">
                <button
                  type="button"
                  className={styles.lightboxClose}
                  aria-label="Close photo"
                  onClick={() => setLightbox(false)}
                >
                  <CloseIcon className={styles.lightboxCloseIcon} />
                </button>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.image} alt="" className={styles.lightboxImage} />
              </div>
            </div>,
            document.body,
          )
        : null}
    </article>
  );
}
