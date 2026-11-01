"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";

import type {
  ConnectionState,
  NetworkCounts,
  NetworkOverview,
  PersonCard,
} from "@/lib/social-types";

import { NetworkIcon, PinIcon, SearchIcon, UsersIcon } from "./Icons";
import InviteDialog from "./InviteDialog";
import PersonAvatar from "./PersonAvatar";
import PersonLine, { personOf, reasonOf } from "./PersonLine";
import styles from "./seeker.module.scss";
import { messageOf, postJson } from "./social-client";

// ------------------------------------------------------------------
//  My Network.
//
//  The page LinkedIn opens from its second destination, in the order a
//  reader works through it: who is waiting on an answer, who is worth
//  knowing, who you already know, and who you are waiting on. Every
//  section is a list of the same card, and every button writes through
//  one route (`/api/connections`), so the four states the graph knows can
//  never disagree with what is on screen.
//
//  The figures at the top are updated from the route's own answer rather
//  than by re-reading the page: accepting an invitation moves a number,
//  and the number should move with the row.
// ------------------------------------------------------------------

type Section = "invitations" | "people" | "connections" | "sent";

type Counts = NetworkCounts;

type Payload = { state: ConnectionState; counts: Counts };

function Grid({ children }: { children: ReactNode }) {
  return <ul className={styles.peopleGrid}>{children}</ul>;
}

function Tile({
  person,
  following,
  busy,
  onFollow,
  onConnect,
  connectLabel,
  onMessage,
}: {
  person: PersonCard;
  following: boolean;
  busy: boolean;
  onFollow?: () => void;
  onConnect: () => void;
  connectLabel: string;
  onMessage?: boolean;
}) {
  return (
    <li className={styles.personTile}>
      <Link
        href={`/seeker/people/${person.id}`}
        className={styles.personTileFace}
        aria-label={`Open ${person.name}'s profile`}
      >
        <PersonAvatar person={personOf(person)} src={person.photo} large />

        <strong className={styles.personTileName}>{person.name}</strong>
        <span className={styles.personTileHeadline}>
          {person.headline || (person.username ? `@${person.username}` : "On Recruit AI")}
        </span>
        <span className={styles.personTileReason}>{reasonOf(person)}</span>

        {person.city ? (
          <span className={styles.personTileCity}>
            <PinIcon className={styles.tileIcon} />
            {person.city}
          </span>
        ) : null}
      </Link>

      <div className={styles.personTileActions}>
        <button
          type="button"
          className={styles.socialButton}
          onClick={onConnect}
          disabled={busy}
        >
          {busy ? "…" : connectLabel}
        </button>

        {onFollow ? (
          <button
            type="button"
            className={following ? styles.socialButtonQuiet : styles.socialButtonGhost}
            onClick={onFollow}
            disabled={busy}
            aria-pressed={following}
          >
            {following ? "Following" : "Follow"}
          </button>
        ) : null}

        {onMessage ? (
          <Link
            href={`/seeker/messages?with=${encodeURIComponent(person.id)}`}
            className={styles.socialButtonGhost}
          >
            Message
          </Link>
        ) : null}
      </div>
    </li>
  );
}

export default function NetworkBoard({ overview }: { overview: NetworkOverview }) {
  const [invitations, setInvitations] = useState(overview.invitations);
  const [outgoing, setOutgoing] = useState(overview.outgoing);
  const [connections, setConnections] = useState(overview.connections);
  const [suggestions, setSuggestions] = useState(overview.suggestions);
  const [counts, setCounts] = useState<Counts>(overview.counts);

  const [section, setSection] = useState<Section>(
    overview.invitations.length ? "invitations" : "people",
  );

  const [following, setFollowing] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  // The person whose invite-with-note dialog is open, or null. Connecting
  // from a suggestion goes through the dialog (so a note can be added);
  // every other action fires straight from its button.
  const [inviting, setInviting] = useState<PersonCard | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PersonCard[] | null>(null);
  const [searching, setSearching] = useState(false);

  function drop(id: string) {
    setInvitations((list) => list.filter((person) => person.id !== id));
    setOutgoing((list) => list.filter((person) => person.id !== id));
    setConnections((list) => list.filter((person) => person.id !== id));
    setSuggestions((list) => list.filter((person) => person.id !== id));
    setResults((list) => (list ? list.filter((person) => person.id !== id) : list));
  }

  /**
   * Move a person between the lists after the graph answered. The card is
   * taken out of every list before the new one is filled, so a suggestion can
   * become a sent invitation without appearing in both.
   */
  function applyOutcome(card: PersonCard, data: Payload) {
    setCounts(data.counts);

    if (data.state === "outgoing") {
      drop(card.id);
      setOutgoing((list) => [card, ...list]);
    } else if (data.state === "connected") {
      drop(card.id);
      setConnections((list) => [card, ...list]);
    } else {
      drop(card.id);
    }
  }

  /**
   * One action, then the list it belongs to moves.
   */
  async function act(person: PersonCard, action: "accept" | "decline" | "withdraw" | "remove") {
    if (busy) return;

    const card = person;
    setBusy(card.id);
    setError("");

    try {
      const data = await postJson<Payload>("/api/connections", {
        personId: card.id,
        action,
      });

      applyOutcome(card, data);
    } catch (problem) {
      setError(messageOf(problem));
    } finally {
      setBusy(null);
    }
  }

  /**
   * Send the invitation the dialog collected. Unlike `act` this throws on
   * failure, because `InviteDialog` keeps itself open and shows the message
   * when the request is lost — the note should be retryable, not retyped.
   */
  async function sendInvite(note: string) {
    const card = inviting;
    if (!card) return;

    const data = await postJson<Payload>("/api/connections", {
      personId: card.id,
      action: "invite",
      ...(note ? { note } : {}),
    });

    applyOutcome(card, data);
  }

  async function toggleFollow(person: PersonCard) {
    if (busy) return;

    const next = !(following[person.id] ?? false);
    setBusy(person.id);
    setError("");
    setFollowing((current) => ({ ...current, [person.id]: next }));

    try {
      const data = await postJson<{ following: boolean }>(
        `/api/people/${encodeURIComponent(person.id)}/follow`,
        { follow: next },
      );

      setFollowing((current) => ({ ...current, [person.id]: data.following }));
    } catch (problem) {
      setFollowing((current) => ({ ...current, [person.id]: !next }));
      setError(messageOf(problem));
    } finally {
      setBusy(null);
    }
  }

  async function search(event: FormEvent) {
    event.preventDefault();

    const term = query.trim();
    if (!term) {
      setResults(null);
      return;
    }

    setSearching(true);
    setError("");

    try {
      const response = await fetch(`/api/people?q=${encodeURIComponent(term)}&limit=12`, {
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

  const shown = results ?? suggestions;

  const TABS: { key: Section; label: string; count: number }[] = [
    { key: "invitations", label: "Invitations", count: counts.incoming },
    { key: "people", label: "People you may know", count: shown.length },
    { key: "connections", label: "Connections", count: counts.connections },
    { key: "sent", label: "Sent", count: counts.outgoing },
  ];

  return (
    <div className={styles.networkPage}>
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>My Network</h1>
          <p className={styles.pageSub}>
            People you know, people your connections know, and the invitations
            waiting on an answer.
          </p>
        </div>

        <form className={styles.peopleSearch} onSubmit={(event) => void search(event)}>
          <SearchIcon className={styles.peopleSearchIcon} />
          <input
            className={styles.peopleSearchInput}
            type="search"
            value={query}
            placeholder="Search by name or username"
            aria-label="Search people"
            onChange={(event) => {
              setQuery(event.target.value);
              if (!event.target.value.trim()) setResults(null);
            }}
          />
        </form>
      </header>

      <dl className={styles.networkStats}>
        <div className={styles.networkStat}>
          <dt>Connections</dt>
          <dd>{counts.connections}</dd>
        </div>
        <div className={styles.networkStat}>
          <dt>Invitations</dt>
          <dd>{counts.incoming}</dd>
        </div>
        <div className={styles.networkStat}>
          <dt>Following</dt>
          <dd>{counts.following}</dd>
        </div>
        <div className={styles.networkStat}>
          <dt>Followers</dt>
          <dd>{counts.followers}</dd>
        </div>
      </dl>

      {error ? (
        <p className={styles.socialError} role="alert">
          {error}
          <button type="button" className={styles.socialErrorClose} onClick={() => setError("")}>
            Dismiss
          </button>
        </p>
      ) : null}

      <nav className={styles.networkTabs} aria-label="Network sections">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={section === tab.key ? styles.networkTabActive : styles.networkTab}
            aria-current={section === tab.key ? "true" : undefined}
            onClick={() => setSection(tab.key)}
          >
            {tab.label}
            {tab.count ? <span className={styles.networkTabCount}>{tab.count}</span> : null}
          </button>
        ))}
      </nav>

      {section === "invitations" ? (
        <section className={styles.socialCard} aria-labelledby="network-invitations">
          <div className={styles.socialCardHead}>
            <h2 className={styles.socialCardTitle} id="network-invitations">
              Invitations
            </h2>
            <span className={styles.socialCardNote}>
              {invitations.length ? `${invitations.length} waiting` : "Nothing waiting"}
            </span>
          </div>

          {invitations.length ? (
            <ul className={styles.personList}>
              {invitations.map((person) => (
                <PersonLine key={person.id} person={person} note={reasonOf(person)}>
                  <button
                    type="button"
                    className={styles.socialButton}
                    onClick={() => void act(person, "accept")}
                    disabled={busy === person.id}
                  >
                    {busy === person.id ? "…" : "Accept"}
                  </button>
                  <button
                    type="button"
                    className={styles.socialButtonGhost}
                    onClick={() => void act(person, "decline")}
                    disabled={busy === person.id}
                  >
                    Ignore
                  </button>
                </PersonLine>
              ))}
            </ul>
          ) : (
            <p className={styles.socialEmpty}>
              No invitations right now. When someone asks to connect, they land
              here with the bell.
            </p>
          )}
        </section>
      ) : null}

      {section === "people" ? (
        <section className={styles.socialCard} aria-labelledby="network-people">
          <div className={styles.socialCardHead}>
            <h2 className={styles.socialCardTitle} id="network-people">
              {results ? `Results for “${query.trim()}”` : "People you may know"}
            </h2>
            <span className={styles.socialCardNote}>
              {searching
                ? "Searching…"
                : results
                  ? `${shown.length} found`
                  : "Connections of your connections"}
            </span>
          </div>

          {shown.length ? (
            <Grid>
              {shown.map((person) => (
                <Tile
                  key={person.id}
                  person={person}
                  busy={busy === person.id}
                  following={following[person.id] ?? false}
                  onFollow={() => void toggleFollow(person)}
                  onConnect={() => setInviting(person)}
                  connectLabel="Connect"
                />
              ))}
            </Grid>
          ) : (
            <p className={styles.socialEmpty}>
              {results
                ? "No one matched that. Try a shorter name."
                : "Nobody new to suggest yet. As more members join, the people your connections know show up here."}
            </p>
          )}
        </section>
      ) : null}

      {section === "connections" ? (
        <section className={styles.socialCard} aria-labelledby="network-connections">
          <div className={styles.socialCardHead}>
            <h2 className={styles.socialCardTitle} id="network-connections">
              Your connections
            </h2>
            <span className={styles.socialCardNote}>{connections.length} shown</span>
          </div>

          {connections.length ? (
            <Grid>
              {connections.map((person) => (
                <Tile
                  key={person.id}
                  person={person}
                  busy={busy === person.id}
                  following={following[person.id] ?? false}
                  onFollow={() => void toggleFollow(person)}
                  onConnect={() => void act(person, "remove")}
                  connectLabel="Remove"
                  onMessage
                />
              ))}
            </Grid>
          ) : (
            <p className={styles.socialEmpty}>
              No connections yet. Accept an invitation or connect with someone
              in People you may know — a connection opens both profiles to each
              other.
            </p>
          )}
        </section>
      ) : null}

      {section === "sent" ? (
        <section className={styles.socialCard} aria-labelledby="network-sent">
          <div className={styles.socialCardHead}>
            <h2 className={styles.socialCardTitle} id="network-sent">
              Sent invitations
            </h2>
            <span className={styles.socialCardNote}>
              {outgoing.length ? `${outgoing.length} pending` : "Nothing pending"}
            </span>
          </div>

          {outgoing.length ? (
            <ul className={styles.personList}>
              {outgoing.map((person) => (
                <PersonLine key={person.id} person={person} note="Waiting on their answer">
                  <button
                    type="button"
                    className={styles.socialButtonGhost}
                    onClick={() => void act(person, "withdraw")}
                    disabled={busy === person.id}
                  >
                    {busy === person.id ? "…" : "Withdraw"}
                  </button>
                </PersonLine>
              ))}
            </ul>
          ) : (
            <p className={styles.socialEmpty}>
              Every invitation you send waits here until it is accepted.
            </p>
          )}
        </section>
      ) : null}

      <section className={styles.networkAside}>
        <NetworkIcon className={styles.networkAsideIcon} />
        <div>
          <h2 className={styles.networkAsideTitle}>How connections work</h2>
          <p className={styles.networkAsideText}>
            A connection opens both profiles to each other and puts each of you
            in the other&apos;s Following tab. Following alone opens the profile
            without asking for anything back.
          </p>
          <Link href="/seeker" className={styles.networkAsideLink}>
            <UsersIcon className={styles.shortcutIcon} />
            Back to your feed
          </Link>
        </div>
      </section>

      {inviting ? (
        <InviteDialog
          person={inviting}
          onClose={() => setInviting(null)}
          onSend={sendInvite}
        />
      ) : null}
    </div>
  );
}
