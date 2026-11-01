// ------------------------------------------------------------------
//  Messages — one conversation at a time, and the inbox that lists them.
//
//  There is no `conversations` table on purpose. A conversation is the pair
//  of two ids, and the inbox is the newest message per counterpart; adding
//  a table would only give the same fact a second place to be wrong. The
//  thread is addressed by the other person's id, which is also how a
//  notification and a profile button link into it.
//
//  Reading is one query; the sender's copy is never counted as unread, and
//  `markThreadRead` is the only writer of `read_at` on someone else's
//  behalf.
// ------------------------------------------------------------------

import "server-only";

import { randomUUID } from "node:crypto";

import { db, ensureSchema } from "./db";
import { notify } from "./notifications";
import { readPerson } from "./people";
import {
  readPersonCard,
  readPersonCards,
  readSocialId,
  SocialError,
} from "./social";
import {
  MAX_MESSAGE_BODY,
  MAX_MESSAGE_PREVIEW,
  type ChatMessage,
  type Conversation,
  type ConversationThread,
} from "./social-types";

/** Trimmed words, with the control characters that would break a bubble. */
function readMessageBody(value: unknown) {
  if (typeof value !== "string") throw new SocialError("Write a message first.");

  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) {
    throw new SocialError("Check what you wrote and try again.");
  }

  const body = value.replace(/\r\n/g, "\n").trim();

  if (!body) throw new SocialError("Write a message first.");
  if (body.length > MAX_MESSAGE_BODY) {
    throw new SocialError(`Keep it under ${MAX_MESSAGE_BODY} characters.`);
  }

  return body;
}

/** Where a thread left off, for the inbox and the bell. */
function previewOf(body: string) {
  const line = body.replace(/\s+/g, " ").trim();
  return line.length > MAX_MESSAGE_PREVIEW
    ? `${line.slice(0, MAX_MESSAGE_PREVIEW)}…`
    : line;
}

/** How many messages are waiting to be opened, across every thread. */
export async function unreadMessages(userId: string): Promise<number> {
  await ensureSchema();

  const result = await db().execute({
    sql: `SELECT count(*) AS total FROM site_messages
          WHERE recipient_id = ? AND read_at IS NULL`,
    args: [userId],
  });

  return Number(result.rows[0]?.total ?? 0);
}

/**
 * The inbox, newest conversation first.
 *
 * One read of the reader's messages is enough: the newest row per
 * counterpart becomes the summary, and the unread rows are counted in the
 * same pass. The 500-row ceiling keeps a very old account from loading its
 * whole history to draw thirty rows.
 */
export async function listConversations(
  viewerId: string,
  limit = 40,
): Promise<Conversation[]> {
  await ensureSchema();

  const rows = await db().execute({
    sql: `SELECT id, sender_id, recipient_id, body, created, read_at,
                 CASE WHEN sender_id = ? THEN recipient_id ELSE sender_id END AS other
          FROM site_messages
          WHERE sender_id = ? OR recipient_id = ?
          ORDER BY created DESC, id DESC
          LIMIT 500`,
    args: [viewerId, viewerId, viewerId],
  });

  if (!rows.rows.length) return [];

  type Latest = { body: string; created: number; mine: boolean };

  const latest = new Map<string, Latest>();
  const unread = new Map<string, number>();

  for (const row of rows.rows) {
    const other = String(row.other);
    const mine = String(row.sender_id) === viewerId;

    if (!latest.has(other)) {
      latest.set(other, {
        body: String(row.body ?? ""),
        created: Number(row.created),
        mine,
      });
    }

    if (!mine && row.read_at === null) {
      unread.set(other, (unread.get(other) ?? 0) + 1);
    }
  }

  const cards = await readPersonCards([...latest.keys()]);

  return [...latest.entries()]
    .map(([other, last]): Conversation | null => {
      const person = cards.get(other);
      if (!person) return null;

      return {
        person,
        last: previewOf(last.body),
        lastAt: last.created,
        unread: unread.get(other) ?? 0,
        mine: last.mine,
      };
    })
    .filter((entry): entry is Conversation => Boolean(entry))
    .sort((a, b) => b.lastAt - a.lastAt)
    .slice(0, Math.min(Math.max(limit, 1), 60));
}

/** One thread, oldest first, plus who it is with. */
export async function readThread(
  viewerId: string,
  otherId: string,
  limit = 150,
): Promise<ConversationThread> {
  const other = readSocialId(otherId, "That conversation could not be found.");

  if (other === viewerId) {
    throw new SocialError("That conversation is with yourself.");
  }

  await ensureSchema();

  const [person, rows] = await Promise.all([
    readPersonCard(other),
    db().execute({
      sql: `SELECT id, sender_id, recipient_id, body, created, read_at
            FROM site_messages
            WHERE (sender_id = ? AND recipient_id = ?)
               OR (sender_id = ? AND recipient_id = ?)
            ORDER BY created DESC, id DESC
            LIMIT ?`,
      args: [viewerId, other, other, viewerId, Math.min(Math.max(limit, 1), 300)],
    }),
  ]);

  if (!rows.rows.length && !person.username) {
    throw new SocialError("That conversation could not be found.", 404);
  }

  let unread = 0;

  const messages = rows.rows
    .slice()
    .reverse()
    .map((row): ChatMessage => {
      const mine = String(row.sender_id) === viewerId;

      if (!mine && row.read_at === null) unread += 1;

      return {
        id: String(row.id),
        body: String(row.body ?? ""),
        created: Number(row.created),
        mine,
        // The stamp on a row you sent is the other person's: it exists once
        // they have opened the thread, which is exactly what a seen receipt
        // claims. Their own rows carry their stamp, and that is not news.
        seen: mine && row.read_at !== null,
      };
    });

  return { person, messages, unread };
}

/**
 * Send one message. The row, the bell and the returned bubble all come
 * from the same body, so what the sender sees is what the recipient got.
 */
export async function sendMessage(
  viewer: { id: string; name: string },
  toId: string,
  input: unknown,
) {
  const other = readSocialId(toId, "That person could not be found.");

  if (other === viewer.id) {
    throw new SocialError("You cannot message yourself.");
  }

  const body = readMessageBody(input);

  await ensureSchema();

  const person = await readPerson(other);
  if (!person) throw new SocialError("That person could not be found.", 404);

  const created = Date.now();
  const id = `m_${randomUUID().replace(/-/g, "")}`;

  await db().execute({
    sql: `INSERT INTO site_messages (id, sender_id, recipient_id, body, created, read_at)
          VALUES (?, ?, ?, ?, ?, NULL)`,
    args: [id, viewer.id, other, body, created],
  });

  await notify({
    userId: other,
    actorId: viewer.id,
    kind: "message",
    entityId: viewer.id,
    body: previewOf(body),
  });

  const message: ChatMessage = {
    id,
    body,
    created,
    mine: true,
    // Nobody has read a message that was written a moment ago.
    seen: false,
  };

  return { message, person: await readPersonCard(other) };
}

/** Mark everything the other person sent as read. */
export async function markThreadRead(viewerId: string, otherId: string) {
  const other = readSocialId(otherId, "That conversation could not be found.");

  await ensureSchema();

  await db().execute({
    sql: `UPDATE site_messages SET read_at = ?
          WHERE recipient_id = ? AND sender_id = ? AND read_at IS NULL`,
    args: [Date.now(), viewerId, other],
  });

  return { unread: 0, total: await unreadMessages(viewerId) };
}
