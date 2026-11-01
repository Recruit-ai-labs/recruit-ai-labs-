// ------------------------------------------------------------------
//  The bell.
//
//  Every surface that does something to someone else writes one row here:
//  a follow, an invitation, a message, a mention, a like, a comment, a
//  repost. The row names the actor and what happened, never the sentence —
//  the sentence is written when the reader's list is built, so the wording
//  can change without migrating a table.
//
//  Two rules worth naming:
//
//  · A notification never fails the action that caused it. Following
//    someone must work even if the bell is unreachable, so `notify`
//    reports and swallows.
//  · An unread notification is replaced rather than stacked — three
//    messages from one person are one row in the bell, not three.
// ------------------------------------------------------------------

import "server-only";

import { randomUUID } from "node:crypto";

import { db, ensureSchema } from "./db";
import { readPersonCards } from "./social";
import type { NotificationKind, SocialNotification } from "./social-types";

/** How much of a message or comment the row quotes. */
const EXCERPT = 140;

type NotifyInput = {
  /** Who receives it. */
  userId: string;
  /** Who did it. */
  actorId: string;
  kind: NotificationKind;
  /** A post id, or the counterpart of a conversation. */
  entityId?: string | null;
  /** The words that earned the notification: a message, a comment, a post. */
  body?: string;
};

const PHRASE: Record<NotificationKind, string> = {
  follow: "started following you",
  connection: "sent you a connection invitation",
  "connection-accepted": "accepted your connection invitation",
  message: "sent you a message",
  mention: "mentioned you in a post",
  like: "liked your post",
  comment: "commented on your post",
  repost: "reposted your post",
};

/** Where a row goes when it is clicked. */
function hrefOf(kind: NotificationKind, actorId: string, entityId: string) {
  switch (kind) {
    case "connection":
      return "/seeker/network";
    case "message":
      return `/seeker/messages?with=${encodeURIComponent(actorId)}`;
    case "mention":
    case "like":
    case "comment":
    case "repost":
      return entityId
        ? `/seeker#post-${encodeURIComponent(entityId)}`
        : "/seeker";
    default:
      return `/seeker/people/${encodeURIComponent(actorId)}`;
  }
}

/**
 * Write one notification. Never throws: the action that caused it has
 * already succeeded and must not be undone by a bell that is down.
 */
export async function notify(input: NotifyInput): Promise<void> {
  if (!input.userId || input.userId === input.actorId) return;

  try {
    await ensureSchema();

    const body = (input.body ?? "").slice(0, EXCERPT);
    const entity = input.entityId ?? null;

    // The unread row for the same actor and kind is replaced, so a burst
    // of messages reads as one line rather than as a wall.
    await db().batch([
      {
        sql: `DELETE FROM site_notifications
              WHERE user_id = ? AND actor_id = ? AND kind = ?
                AND entity_id IS ? AND read_at IS NULL`,
        args: [input.userId, input.actorId, input.kind, entity],
      },
      {
        sql: `INSERT INTO site_notifications
                (id, user_id, actor_id, kind, entity_id, body, created, read_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
        args: [
          `n_${randomUUID().replace(/-/g, "")}`,
          input.userId,
          input.actorId,
          input.kind,
          entity,
          body,
          Date.now(),
        ],
      },
    ]);
  } catch (error) {
    console.error("Could not write a notification", error);
  }
}

/** How many rows are still unread. */
export async function unreadNotifications(userId: string): Promise<number> {
  await ensureSchema();

  const result = await db().execute({
    sql: "SELECT count(*) AS total FROM site_notifications WHERE user_id = ? AND read_at IS NULL",
    args: [userId],
  });

  return Number(result.rows[0]?.total ?? 0);
}

/** The list the bell page prints, newest first. */
export async function listNotifications(
  viewerId: string,
  limit = 40,
): Promise<SocialNotification[]> {
  await ensureSchema();

  const rows = await db().execute({
    sql: `SELECT id, actor_id, kind, entity_id, body, created, read_at
          FROM site_notifications
          WHERE user_id = ?
          ORDER BY created DESC, id DESC
          LIMIT ?`,
    args: [viewerId, Math.min(Math.max(limit, 1), 100)],
  });

  if (!rows.rows.length) return [];

  const actors = await readPersonCards(
    rows.rows.map((row) => String(row.actor_id)),
  );

  return rows.rows.map((row): SocialNotification => {
    const actorId = String(row.actor_id);
    const kind = String(row.kind) as NotificationKind;
    const entityId = row.entity_id === null ? "" : String(row.entity_id);

    return {
      id: String(row.id),
      kind,
      actor: actors.get(actorId) ?? {
        id: actorId,
        name: "Recruit AI member",
        username: "",
        headline: "",
        photo: null,
        city: "",
        mutual: 0,
      },
      text: PHRASE[kind] ?? "did something new",
      excerpt: String(row.body ?? ""),
      href: hrefOf(kind, actorId, entityId),
      created: Number(row.created),
      unread: row.read_at === null,
    };
  });
}

/** Clear one row, or the whole list when no id is given. */
export async function markNotificationsRead(
  viewerId: string,
  id?: string,
): Promise<{ unread: number }> {
  await ensureSchema();

  if (id) {
    await db().execute({
      sql: `UPDATE site_notifications SET read_at = ?
            WHERE id = ? AND user_id = ? AND read_at IS NULL`,
      args: [Date.now(), id, viewerId],
    });
  } else {
    await db().execute({
      sql: `UPDATE site_notifications SET read_at = ?
            WHERE user_id = ? AND read_at IS NULL`,
      args: [Date.now(), viewerId],
    });
  }

  return { unread: await unreadNotifications(viewerId) };
}
