"use client";

import { useState, type ComponentType } from "react";
import Link from "next/link";

import type { NotificationKind, SocialNotification } from "@/lib/social-types";
import { plural, timeAgo } from "@/lib/feed-types";

import {
  BellIcon,
  CommentIcon,
  LikeIcon,
  NetworkIcon,
  RepostIcon,
  SendIcon,
  UsersIcon,
} from "./Icons";
import PersonAvatar from "./PersonAvatar";
import styles from "./seeker.module.scss";
import { messageOf, postJson } from "./social-client";

// ------------------------------------------------------------------
//  Notifications.
//
//  One row per thing someone did: followed, invited, accepted, messaged,
//  mentioned, liked, commented, reposted. The sentence is written on the
//  server (see `notifications.ts`), so this page only decides which mark
//  sits beside it and whether the row is still unread.
//
//  Two rules from the module carry through to the screen:
//
//  · an unread row is replaced rather than stacked, so a burst of messages
//    from one person is one line — and the line shows the newest words;
//  · opening the page does not clear it. The reader marks a row read by
//    opening it, or clears the lot with one button, because a bell that
//    empties itself is a bell you stop trusting.
// ------------------------------------------------------------------

const MARK: Record<NotificationKind, ComponentType<{ className?: string }>> = {
  follow: UsersIcon,
  connection: NetworkIcon,
  "connection-accepted": UsersIcon,
  message: SendIcon,
  mention: CommentIcon,
  like: LikeIcon,
  comment: CommentIcon,
  repost: RepostIcon,
};

const TONE: Record<NotificationKind, string> = {
  follow: "People",
  connection: "Invitation",
  "connection-accepted": "Connection",
  message: "Message",
  mention: "Mention",
  like: "Like",
  comment: "Comment",
  repost: "Repost",
};

export default function Notifications({
  initial,
  initialUnread,
}: {
  initial: SocialNotification[];
  initialUnread: number;
}) {
  const [rows, setRows] = useState(initial);
  const [unread, setUnread] = useState(initialUnread);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");

  async function clearAll() {
    if (busy) return;

    setBusy(true);
    setError("");

    try {
      const data = await postJson<{ unread: number }>("/api/notifications", {});
      setRows((current) => current.map((row) => ({ ...row, unread: false })));
      setUnread(data.unread);
    } catch (problem) {
      setError(messageOf(problem));
    } finally {
      setBusy(false);
    }
  }

  async function open(row: SocialNotification) {
    if (!row.unread) return;

    setRows((current) =>
      current.map((entry) => (entry.id === row.id ? { ...entry, unread: false } : entry)),
    );
    setUnread((current) => Math.max(0, current - 1));

    try {
      const data = await postJson<{ unread: number }>("/api/notifications", { id: row.id });
      setUnread(data.unread);
    } catch {
      // The row is already open in front of the reader; a failed receipt
      // only means the badge is a number behind until the next visit.
    }
  }

  const shown = filter === "unread" ? rows.filter((row) => row.unread) : rows;

  return (
    <div className={styles.notificationsPage}>
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>Notifications</h1>
          <p className={styles.pageSub}>
            {unread
              ? `${plural(unread, "new notification")} since your last visit.`
              : "Everything that has happened around you, newest first."}
          </p>
        </div>

        <button
          type="button"
          className={styles.socialButton}
          onClick={() => void clearAll()}
          disabled={busy || !unread}
        >
          {busy ? "Clearing…" : "Mark all read"}
        </button>
      </header>

      <nav className={styles.networkTabs} aria-label="Notification filters">
        <button
          type="button"
          className={filter === "all" ? styles.networkTabActive : styles.networkTab}
          aria-current={filter === "all" ? "true" : undefined}
          onClick={() => setFilter("all")}
        >
          All
          {rows.length ? <span className={styles.networkTabCount}>{rows.length}</span> : null}
        </button>

        <button
          type="button"
          className={filter === "unread" ? styles.networkTabActive : styles.networkTab}
          aria-current={filter === "unread" ? "true" : undefined}
          onClick={() => setFilter("unread")}
        >
          Unread
          {unread ? <span className={styles.networkTabCount}>{unread}</span> : null}
        </button>
      </nav>

      {error ? (
        <p className={styles.socialError} role="alert">
          {error}
          <button type="button" className={styles.socialErrorClose} onClick={() => setError("")}>
            Dismiss
          </button>
        </p>
      ) : null}

      <section className={styles.socialCard} aria-label="Notifications list">
        {shown.length ? (
          <ul className={styles.noticeList}>
            {shown.map((row) => {
              const Mark = MARK[row.kind];
              const tone = TONE[row.kind];

              return (
                <li
                  key={row.id}
                  className={row.unread ? `${styles.notice} ${styles.noticeUnread}` : styles.notice}
                >
                  <Link
                    href={row.href}
                    className={styles.noticeLink}
                    onClick={() => void open(row)}
                  >
                    <span className={styles.noticeAvatar}>
                      <PersonAvatar
                        person={{ firstName: "", lastName: "", name: row.actor.name }}
                        src={row.actor.photo}
                      />
                      <span className={styles.noticeMark} aria-hidden="true">
                        <Mark className={styles.noticeMarkIcon} />
                      </span>
                    </span>

                    <span className={styles.noticeBody}>
                      <span className={styles.noticeLine}>
                        <strong>{row.actor.name}</strong> {row.text}
                      </span>

                      {row.excerpt ? (
                        <span className={styles.noticeExcerpt}>“{row.excerpt}”</span>
                      ) : null}

                      <span className={styles.noticeMeta}>
                        <span className={styles.noticeKind}>{tone}</span>
                        <span aria-hidden="true">·</span>
                        <time dateTime={new Date(row.created).toISOString()}>
                          {timeAgo(row.created)}
                        </time>
                      </span>
                    </span>

                    {row.unread ? (
                      <span className={styles.noticeDot} aria-label="Unread" />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className={styles.noticeEmpty}>
            <BellIcon className={styles.noticeEmptyIcon} />
            <p className={styles.noticeEmptyTitle}>
              {filter === "unread" ? "Nothing unread" : "Nothing here yet"}
            </p>
            <p className={styles.noticeEmptyText}>
              {filter === "unread"
                ? "Every notification has been opened. Switch back to All to read the history."
                : "When someone follows you, invites you, messages you, mentions you in a post or reacts to one, it lands here."}
            </p>
            <div className={styles.noticeEmptyActions}>
              <Link href="/seeker/network" className={styles.socialButton}>
                Open My Network
              </Link>
              <Link href="/seeker" className={styles.socialButtonGhost}>
                Back to feed
              </Link>
            </div>
          </div>
        )}
      </section>

      <p className={styles.railNote}>
        Notifications are kept for your eyes only. Mentioning someone in a post
        sends them a notification with a link back to it.
      </p>
    </div>
  );
}
