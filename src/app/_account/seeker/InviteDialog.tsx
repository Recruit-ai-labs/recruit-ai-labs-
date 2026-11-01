"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

import { MAX_INVITE_NOTE, type PersonCard } from "@/lib/social-types";

import { CloseIcon, SendIcon } from "./Icons";
import PersonAvatar from "./PersonAvatar";
import { personOf } from "./PersonLine";
import styles from "./seeker.module.scss";
import useOverlay from "./useOverlay";

// ------------------------------------------------------------------
//  Invite someone to connect, with an optional note.
//
//  The graph lets you knock on a stranger's door; a line of your own is how
//  LinkedIn turns a cold request into one they actually accept. The note is
//  optional by design — an empty one is a normal invitation, and the send
//  button reads the same either way.
//
//  This dialog owns nothing but the words. The POST belongs to whoever
//  opened it, because each surface moves its own list afterwards: the network
//  page shuffles a suggestion into "Sent", the rail marks a single row
//  pending, the profile re-renders once the lock opens. So `onSend` is handed
//  the finished note and is expected to throw on failure — the dialog shows
//  that error and keeps itself open rather than vanishing on a lost request.
// ------------------------------------------------------------------

type Props = {
  person: PersonCard;
  onClose: () => void;
  onSend: (note: string) => Promise<void>;
};

export default function InviteDialog({ person, onClose, onSend }: Props) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useOverlay(true, () => {
    if (!busy) onClose();
  });

  async function send() {
    if (busy) return;

    setBusy(true);
    setError("");

    try {
      await onSend(note.trim().slice(0, MAX_INVITE_NOTE));
      onClose();
    } catch (problem) {
      // Stay open on a failure so the words are not lost — a dropped
      // invitation should be retryable, not something to retype.
      setError(
        problem instanceof Error
          ? problem.message
          : "That invitation did not go through.",
      );
      setBusy(false);
    }
  }

  return createPortal(
    <div className={styles.overlay}>
      <button
        type="button"
        className={styles.backdrop}
        aria-label="Close invitation"
        onClick={() => {
          if (!busy) onClose();
        }}
      />

      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-title"
      >
        <header className={styles.sheetHead}>
          <div>
            <h2 className={styles.sheetTitle} id="invite-title">
              Invite {person.name} to connect
            </h2>
            <p className={styles.sheetSub}>
              A connection opens both profiles to each other. Add a short note
              so they know why you are reaching out.
            </p>
          </div>
          <button
            type="button"
            className={styles.sheetClose}
            aria-label="Close invitation"
            onClick={onClose}
            disabled={busy}
          >
            <CloseIcon className={styles.sheetCloseIcon} />
          </button>
        </header>

        <figure className={styles.shareQuote}>
          <PersonAvatar person={personOf(person)} src={person.photo} />
          <figcaption className={styles.shareQuoteText}>
            <strong>{person.name}</strong>
            <span>{person.headline || "On Recruit AI"}</span>
          </figcaption>
        </figure>

        <textarea
          className={styles.shareField}
          value={note}
          rows={3}
          maxLength={MAX_INVITE_NOTE}
          placeholder="Add a note (optional)…"
          aria-label={`Note to ${person.name}`}
          onChange={(event) => setNote(event.target.value)}
          autoFocus
        />

        <p className={styles.noteCount}>
          {note.length} of {MAX_INVITE_NOTE}
        </p>

        {error ? (
          <p className={styles.formError} role="alert">
            {error}
          </p>
        ) : null}

        <div className={styles.shareActions}>
          <button
            type="button"
            className={styles.shareGhost}
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>

          <button
            type="button"
            className={styles.sharePrimary}
            onClick={() => void send()}
            disabled={busy}
          >
            <SendIcon className={styles.quickIcon} />
            {busy ? "Sending…" : "Send invitation"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
