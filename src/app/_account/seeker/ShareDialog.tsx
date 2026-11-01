"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import {
  MAX_REPOST_NOTE,
  type FeedPost,
} from "@/lib/feed-types";

import { CheckIcon, CloseIcon, LinkIcon, RepostIcon, SendIcon } from "./Icons";
import PersonAvatar, { type AvatarPerson } from "./PersonAvatar";
import styles from "./seeker.module.scss";
import useOverlay from "./useOverlay";

// ------------------------------------------------------------------
//  Share.
//
//  Two honest options, because there is no messaging service yet and a
//  third dead button would be worse than none:
//
//  · repost to the feed, with a line of your own above the original;
//  · copy a permalink that lands on the post itself.
//
//  The link is the `/seeker` page plus `#post-<id>`, which the card
//  already answers by scrolling to itself and flashing once.
// ------------------------------------------------------------------

type Props = {
  post: FeedPost;
  onClose: () => void;
  onReposted: (post: FeedPost) => void;
  onRepostCount: (count: number) => void;
};

function authorAvatar(post: FeedPost): AvatarPerson {
  return { firstName: "", lastName: "", name: post.author.name };
}

export default function ShareDialog({ post, onClose, onReposted, onRepostCount }: Props) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useOverlay(true, useCallback(() => {
    if (!busy) onClose();
  }, [busy, onClose]));

  // The "Copied" tick is an acknowledgement, not a state of the sheet.
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2200);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copy() {
    const url = `${window.location.origin}/seeker#post-${post.id}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setError("This browser would not let the link be copied. Select it instead.");
    }
  }

  async function share() {
    if (busy) return;

    setBusy(true);
    setError("");

    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "repost", body: note.trim() }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        post?: FeedPost;
        reposts?: number;
        error?: string;
      };

      if (!response.ok || !data.post) {
        throw new Error(data.error ?? "That repost did not go through.");
      }

      onReposted(data.post);
      if (typeof data.reposts === "number") onRepostCount(data.reposts);
      onClose();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "That repost did not go through.");
    } finally {
      setBusy(false);
    }
  }

  const preview = post.quote?.author.name
    ? `${post.quote.author.name}: ${post.quote.body}`
    : `${post.author.name}: ${post.body}`;

  return createPortal(
    <div className={styles.overlay}>
      <button
        type="button"
        className={styles.backdrop}
        aria-label="Close share"
        onClick={() => {
          if (!busy) onClose();
        }}
      />

      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
      >
        <header className={styles.sheetHead}>
          <div>
            <h2 className={styles.sheetTitle} id="share-title">
              Share this post
            </h2>
            <p className={styles.sheetSub}>
              Repost it with a thought, or copy a link to this exact post.
            </p>
          </div>
          <button
            type="button"
            className={styles.sheetClose}
            aria-label="Close share"
            onClick={onClose}
            disabled={busy}
          >
            <CloseIcon className={styles.sheetCloseIcon} />
          </button>
        </header>

        <figure className={styles.shareQuote}>
          <PersonAvatar person={authorAvatar(post)} />
          <figcaption className={styles.shareQuoteText}>
            <strong>{post.author.name}</strong>
            <span>{preview.length > 220 ? `${preview.slice(0, 220)}…` : preview}</span>
          </figcaption>
        </figure>

        <textarea
          className={styles.shareField}
          value={note}
          rows={3}
          maxLength={MAX_REPOST_NOTE}
          placeholder="Add your thought…"
          aria-label="Your thought on this post"
          onChange={(event) => setNote(event.target.value)}
          autoFocus
        />

        {error ? (
          <p className={styles.formError} role="alert">
            {error}
          </p>
        ) : null}

        <div className={styles.shareActions}>
          <button
            type="button"
            className={copied ? styles.shareCopied : styles.shareGhost}
            onClick={() => void copy()}
          >
            {copied ? (
              <CheckIcon className={styles.quickIcon} />
            ) : (
              <LinkIcon className={styles.quickIcon} />
            )}
            {copied ? "Link copied" : "Copy link"}
          </button>

          <button
            type="button"
            className={styles.sharePrimary}
            onClick={() => void share()}
            disabled={busy}
          >
            {busy ? <SendIcon className={styles.quickIcon} /> : <RepostIcon className={styles.quickIcon} />}
            {busy ? "Reposting…" : "Repost to feed"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
