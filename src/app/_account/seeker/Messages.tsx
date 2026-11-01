"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";

import {
  MAX_MESSAGE_BODY,
  type ChatMessage,
  type Conversation,
  type ConversationThread,
  type PersonCard,
} from "@/lib/social-types";
import { plural } from "@/lib/feed-types";

import { CloseIcon, SearchIcon, SendIcon, UsersIcon } from "./Icons";
import PersonAvatar, { type AvatarPerson } from "./PersonAvatar";
import styles from "./seeker.module.scss";
import { messageOf, postJson } from "./social-client";

// ------------------------------------------------------------------
//  Messages.
//
//  Two columns, the shape every inbox settles on: the conversations on
//  the left, the open thread on the right. A thread is addressed by the
//  other person's id (`?with=<id>`), so a bell, a profile button and a
//  pasted link all arrive at the same place.
//
//  Three decisions worth naming:
//
//  · the thread polls itself every eight seconds while it is open, and a
//    new message from the other side is marked read in the same breath —
//    a badge that stays lit while its conversation is on screen is a lie;
//  · that same poll carries the read stamp back, so the newest message you
//    sent says "Seen" once the other person has opened the thread;
//  · a sent message appears immediately and is replaced by the server's
//    copy, which carries the id;
//  · on a phone the list steps aside for the open thread, and the back
//    button is the same move in reverse.
// ------------------------------------------------------------------

const POLL_MS = 8000;

type Props = {
  viewer: AvatarPerson & {
    id: string;
    username: string;
    headline: string;
  };
  conversations: Conversation[];
  active: ConversationThread | null;
  activeId: string | null;
};

function avatarOf(person: PersonCard) {
  return { firstName: "", lastName: "", name: person.name };
}

/** "Today", "Yesterday", or the day's date — the inbox's own clock. */
function dayOf(stamp: number) {
  const then = new Date(stamp);
  const now = new Date();
  const sameDay =
    then.getFullYear() === now.getFullYear() &&
    then.getMonth() === now.getMonth() &&
    then.getDate() === now.getDate();

  if (sameDay) {
    return then.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return then.toLocaleDateString([], { day: "numeric", month: "short" });
}

function Bubble({ message, seen }: { message: ChatMessage; seen: boolean }) {
  return (
    <li className={message.mine ? styles.bubbleRowMine : styles.bubbleRow}>
      <div className={message.mine ? styles.bubbleMine : styles.bubble}>
        <p className={styles.bubbleBody}>{message.body}</p>
        <time className={styles.bubbleTime} dateTime={new Date(message.created).toISOString()}>
          {dayOf(message.created)}
        </time>
        {/* One receipt, on the newest read message only: putting it under
            every bubble would turn a single fact into wallpaper. */}
        {seen ? <span className={styles.bubbleSeen}>Seen</span> : null}
      </div>
    </li>
  );
}

export default function Messages({ viewer, conversations, active, activeId }: Props) {
  const [inbox, setInbox] = useState(conversations);
  const [thread, setThread] = useState<ConversationThread | null>(active);
  const [openId, setOpenId] = useState<string | null>(activeId);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PersonCard[] | null>(null);
  const [searching, setSearching] = useState(false);

  const scroller = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  const scrollDown = useCallback(() => {
    const element = scroller.current;
    if (!element) return;

    element.scrollTop = element.scrollHeight;
  }, []);

  useEffect(() => {
    scrollDown();
  }, [thread?.messages.length, scrollDown]);

  // The thread grows with the writing; the sheet sets the ceiling.
  useEffect(() => {
    const element = box.current;
    if (!element) return;

    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 132)}px`;
  }, [draft]);

  const markRead = useCallback(async (other: string) => {
    try {
      await postJson("/api/messages/read", { with: other });
    } catch {
      // A read receipt that fails is not worth a message: the next open
      // asks again and the badge is only a count.
    }
  }, []);

  const load = useCallback(
    async (other: string) => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/messages?with=${encodeURIComponent(other)}`, {
          cache: "no-store",
        });
        const data = (await response.json().catch(() => ({}))) as
          | ConversationThread
          | { error?: string };

        if (!response.ok) {
          throw new Error(("error" in data && data.error) || "That conversation could not be opened.");
        }

        setThread(data as ConversationThread);
        void markRead(other);
      } catch (problem) {
        setError(messageOf(problem));
        setThread(null);
      } finally {
        setLoading(false);
      }
    },
    [markRead],
  );

  // Opening a conversation is a client move with one server consequence:
  // the thread is read, the unread rows are cleared, and the URL names it
  // so a refresh lands on the same conversation.
  function open(person: PersonCard) {
    setOpenId(person.id);
    setResults(null);
    setQuery("");
    setDraft("");
    setError("");

    window.history.replaceState(
      null,
      "",
      `/seeker/messages?with=${encodeURIComponent(person.id)}`,
    );

    if (active && active.person.id === person.id) {
      setThread(active);
      void markRead(person.id);
      return;
    }

    void load(person.id);
  }

  // While a thread is open, the other side's messages arrive on their own.
  useEffect(() => {
    if (!openId) return;

    let alive = true;

    async function poll() {
      if (document.visibilityState === "hidden" || !openId) return;

      try {
        const response = await fetch(`/api/messages?with=${encodeURIComponent(openId)}`, {
          cache: "no-store",
        });
        if (!response.ok) return;

        const data = (await response.json()) as ConversationThread;
        if (!alive || !Array.isArray(data.messages)) return;

        setThread((current) => {
          if (!current || current.person.id !== data.person.id) return data;

          // A read receipt changes the thread without adding a row, so the
          // length alone is not enough to tell whether anything arrived.
          const seenHere = current.messages.filter((entry) => entry.seen).length;
          const seenThere = data.messages.filter((entry) => entry.seen).length;

          if (current.messages.length === data.messages.length && seenHere === seenThere) {
            return current;
          }

          return data;
        });

        if (data.unread > 0) void markRead(openId);
      } catch {
        // The next poll asks again.
      }
    }

    const timer = window.setInterval(() => void poll(), POLL_MS);

    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [openId, markRead]);

  async function send(event?: FormEvent) {
    event?.preventDefault();

    const body = draft.trim();
    if (!body || !thread || busy) return;

    setBusy(true);
    setError("");

    const temporary: ChatMessage = {
      id: `temp-${Date.now()}`,
      body,
      created: Date.now(),
      mine: true,
      seen: false,
    };

    setThread((current) =>
      current ? { ...current, messages: [...current.messages, temporary] } : current,
    );
    setDraft("");

    try {
      const data = await postJson<{ message: ChatMessage; person: PersonCard }>(
        "/api/messages",
        { to: thread.person.id, body },
      );

      setThread((current) =>
        current
          ? {
              ...current,
              messages: current.messages.map((entry) =>
                entry.id === temporary.id ? data.message : entry,
              ),
            }
          : current,
      );

      setInbox((current) => {
        const person = data.person;
        const next: Conversation = {
          person,
          last: body.length > 140 ? `${body.slice(0, 140)}…` : body,
          lastAt: data.message.created,
          unread: 0,
          mine: true,
        };

        return [next, ...current.filter((entry) => entry.person.id !== person.id)];
      });
    } catch (problem) {
      setThread((current) =>
        current
          ? { ...current, messages: current.messages.filter((entry) => entry.id !== temporary.id) }
          : current,
      );
      setDraft(body);
      setError(messageOf(problem));
    } finally {
      setBusy(false);
    }
  }

  async function searchPeople(event: FormEvent) {
    event.preventDefault();

    const term = query.trim();
    if (!term) {
      setResults(null);
      return;
    }

    setSearching(true);
    setError("");

    try {
      const response = await fetch(`/api/people?q=${encodeURIComponent(term)}&limit=10`, {
        cache: "no-store",
      });
      const data = (await response.json().catch(() => ({}))) as {
        people?: PersonCard[];
        error?: string;
      };

      if (!response.ok) throw new Error(data.error ?? "People could not be searched.");

      setResults(data.people ?? []);
    } catch (problem) {
      setError(messageOf(problem));
    } finally {
      setSearching(false);
    }
  }

  function closeThread() {
    setOpenId(null);
    setThread(null);
    setDraft("");
    setResults(null);
    window.history.replaceState(null, "", "/seeker/messages");
  }

  const unreadTotal = inbox.reduce((total, entry) => total + entry.unread, 0);

  // The newest of your own messages the other side has opened. Walking the
  // thread forwards lands on the last one, and an unread thread lands on
  // nothing — which is the same answer as "no receipt yet".
  let receipt = "";
  for (const entry of thread?.messages ?? []) {
    if (entry.mine && entry.seen) receipt = entry.id;
  }

  return (
    <div className={styles.messagesPage}>
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>Messaging</h1>
          <p className={styles.pageSub}>
            {unreadTotal
              ? `${plural(unreadTotal, "message")} waiting to be opened.`
              : "Every conversation you have started or received."}
          </p>
        </div>
      </header>

      <div className={styles.messenger} data-thread={openId ? "true" : undefined}>
        {/* ------------------------------------------------------ inbox */}
        <section className={styles.inbox} aria-label="Conversations">
          <div className={styles.inboxHead}>
            <form className={styles.inboxSearch} onSubmit={(event) => void searchPeople(event)}>
              <SearchIcon className={styles.peopleSearchIcon} />
              <input
                className={styles.peopleSearchInput}
                type="search"
                value={query}
                placeholder="Search people to message"
                aria-label="Search people to message"
                onChange={(event) => {
                  setQuery(event.target.value);
                  if (!event.target.value.trim()) setResults(null);
                }}
              />
            </form>
          </div>

          {results ? (
            <div className={styles.inboxBody}>
              <p className={styles.inboxLabel}>
                {searching ? "Searching…" : results.length ? "Start a conversation" : "No one matched"}
              </p>

              <ul className={styles.personList}>
                {results.map((person) => (
                  <li key={person.id}>
                    <button
                      type="button"
                      className={styles.inboxRow}
                      onClick={() => open(person)}
                    >
                      <PersonAvatar person={avatarOf(person)} src={person.photo} />
                      <span className={styles.inboxRowBody}>
                        <strong>{person.name}</strong>
                        <span>{person.headline || "On Recruit AI"}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>

              <button type="button" className={styles.inboxBack} onClick={() => setResults(null)}>
                Back to conversations
              </button>
            </div>
          ) : (
            <div className={styles.inboxBody}>
              {inbox.length ? (
                <ul className={styles.conversationList}>
                  {inbox.map((entry) => (
                    <li key={entry.person.id}>
                      <button
                        type="button"
                        className={
                          entry.person.id === openId
                            ? `${styles.inboxRow} ${styles.inboxRowActive}`
                            : styles.inboxRow
                        }
                        onClick={() => open(entry.person)}
                        aria-current={entry.person.id === openId ? "true" : undefined}
                      >
                        <PersonAvatar person={avatarOf(entry.person)} src={entry.person.photo} />

                        <span className={styles.inboxRowBody}>
                          <span className={styles.inboxRowTop}>
                            <strong>{entry.person.name}</strong>
                            <time dateTime={new Date(entry.lastAt).toISOString()}>
                              {dayOf(entry.lastAt)}
                            </time>
                          </span>

                          <span className={styles.inboxRowLast}>
                            {entry.mine ? "You: " : ""}
                            {entry.last}
                          </span>
                        </span>

                        {entry.unread ? (
                          <span className={styles.unreadDot} aria-label={`${entry.unread} unread`}>
                            {entry.unread}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className={styles.inboxEmpty}>
                  <UsersIcon className={styles.inboxEmptyIcon} />
                  <p className={styles.inboxEmptyTitle}>No conversations yet</p>
                  <p className={styles.inboxEmptyText}>
                    Search for someone above, or message a person from their
                    profile.
                  </p>
                  <Link href="/seeker/network" className={styles.socialButton}>
                    Find people
                  </Link>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ----------------------------------------------------- thread */}
        <section className={styles.threadPane} aria-label="Conversation">
          {openId && thread ? (
            <>
              <header className={styles.threadHead}>
                <button
                  type="button"
                  className={styles.threadBack}
                  onClick={closeThread}
                  aria-label="Back to conversations"
                >
                  <CloseIcon className={styles.threadBackIcon} />
                </button>

                <Link
                  href={`/seeker/people/${thread.person.id}`}
                  className={styles.threadPerson}
                >
                  <PersonAvatar person={avatarOf(thread.person)} src={thread.person.photo} />

                  <span className={styles.threadIdentity}>
                    <strong>{thread.person.name}</strong>
                    <span>{thread.person.headline || "On Recruit AI"}</span>
                  </span>
                </Link>

                <Link
                  href={`/seeker/people/${thread.person.id}`}
                  className={styles.threadProfile}
                >
                  Profile
                </Link>
              </header>

              <div className={styles.threadScroll} ref={scroller}>
                {thread.messages.length ? (
                  <ul className={styles.bubbleList}>
                    {thread.messages.map((message) => (
                      <Bubble
                        key={message.id}
                        message={message}
                        seen={message.id === receipt}
                      />
                    ))}
                  </ul>
                ) : (
                  <div className={styles.threadIntro}>
                    <PersonAvatar person={avatarOf(thread.person)} src={thread.person.photo} large />
                    <p className={styles.threadIntroTitle}>
                      This is the start of your conversation with{" "}
                      {thread.person.name.split(" ")[0]}.
                    </p>
                    <p className={styles.threadIntroText}>
                      Say what you are working on. A message is delivered to
                      their inbox and rings the bell.
                    </p>
                  </div>
                )}
              </div>

              <form className={styles.threadComposer} onSubmit={(event) => void send(event)}>
                <textarea
                  ref={box}
                  className={styles.threadInput}
                  value={draft}
                  rows={1}
                  maxLength={MAX_MESSAGE_BODY}
                  placeholder="Write a message…"
                  aria-label="Write a message"
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" || event.shiftKey) return;

                    event.preventDefault();
                    void send();
                  }}
                />

                <button
                  type="submit"
                  className={styles.threadSend}
                  disabled={!draft.trim() || busy}
                  aria-label="Send message"
                >
                  <SendIcon className={styles.threadSendIcon} />
                </button>
              </form>
            </>
          ) : (
            <div className={styles.threadEmpty}>
              {loading ? (
                <p className={styles.threadEmptyText}>Opening the conversation…</p>
              ) : (
                <>
                  <span className={styles.threadEmptyMark} aria-hidden="true">
                    <SendIcon className={styles.threadEmptyIcon} />
                  </span>
                  <p className={styles.threadEmptyTitle}>Pick a conversation</p>
                  <p className={styles.threadEmptyText}>
                    Choose someone on the left, or search for a person to start a
                    thread. Everything you send stays inside the workspace.
                  </p>
                </>
              )}
            </div>
          )}

          {error ? (
            <p className={styles.socialError} role="alert">
              {error}
              <button type="button" className={styles.socialErrorClose} onClick={() => setError("")}>
                Dismiss
              </button>
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
