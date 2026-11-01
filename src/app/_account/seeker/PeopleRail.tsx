"use client";

import { useState } from "react";
import Link from "next/link";

import type { PersonCard } from "@/lib/social-types";

import InviteDialog from "./InviteDialog";
import PersonAvatar from "./PersonAvatar";
import { personOf, reasonOf } from "./PersonLine";
import styles from "./seeker.module.scss";
import { messageOf, postJson } from "./social-client";

// ------------------------------------------------------------------
//  People you may know, in the home rail.
//
//  The rail is where LinkedIn puts the graph: three people, the reason
//  they are being suggested (a mutual connection, or the city you both
//  work from), and one button. Connect sends an invitation; Follow is the
//  quieter second move. Both leave the row in place with their new state
//  rather than removing it, so the rail never jumps under the pointer —
//  the invitation is what disappears, and it disappears from the list of
//  candidates when the page is next read.
// ------------------------------------------------------------------

export default function PeopleRail({
  people,
  invitations,
}: {
  people: PersonCard[];
  invitations: number;
}) {
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [following, setFollowing] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  // The person whose invite-with-note dialog is open. Connecting from the
  // rail goes through the dialog so a line can be added; Follow still fires
  // straight from its button.
  const [inviting, setInviting] = useState<PersonCard | null>(null);

  /**
   * Send the invitation the dialog collected. Throws on failure so the dialog
   * stays open with the note intact; on success it marks the row pending.
   */
  async function sendInvite(note: string) {
    const person = inviting;
    if (!person) return;

    const data = await postJson<{ state: string }>("/api/connections", {
      personId: person.id,
      action: "invite",
      ...(note ? { note } : {}),
    });

    setSent((current) => ({
      ...current,
      [person.id]: data.state === "outgoing" || data.state === "connected",
    }));
  }

  async function follow(person: PersonCard) {
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

  return (
    <>
      {invitations ? (
        <Link href="/seeker/network" className={styles.inviteBanner}>
          <span className={styles.inviteBannerCount}>{invitations}</span>
          <span>
            {invitations === 1 ? "invitation is" : "invitations are"} waiting on
            your answer
          </span>
          <span className={styles.inviteBannerGo} aria-hidden="true">
            →
          </span>
        </Link>
      ) : null}

      <ul className={styles.railPeople}>
        {people.map((person) => {
          const invited = sent[person.id] ?? false;
          const isFollowing = following[person.id] ?? false;

          return (
            <li className={styles.suggestion} key={person.id}>
              <Link
                href={`/seeker/people/${person.id}`}
                className={styles.railPersonLink}
                aria-label={`Open ${person.name}'s profile`}
              >
                <PersonAvatar person={personOf(person)} src={person.photo} />

                <span className={styles.suggestionBody}>
                  <strong className={styles.suggestionName}>{person.name}</strong>
                  <span className={styles.suggestionHeadline}>
                    {person.headline || "On Recruit AI"}
                  </span>
                  <span className={styles.railPersonNote}>{reasonOf(person)}</span>
                </span>
              </Link>

              <div className={styles.railPersonActions}>
                <button
                  type="button"
                  className={invited ? styles.suggestionFollowing : styles.suggestionFollow}
                  onClick={() => setInviting(person)}
                  disabled={busy === person.id || invited}
                >
                  {busy === person.id ? "…" : invited ? "Pending" : "Connect"}
                </button>

                <button
                  type="button"
                  className={styles.railFollowLink}
                  onClick={() => void follow(person)}
                  disabled={busy === person.id}
                  aria-pressed={isFollowing}
                >
                  {isFollowing ? "Following" : "Follow"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <Link href="/seeker/network" className={styles.waitingFooter}>
        <span>See all suggestions</span>
        <span aria-hidden="true">→</span>
      </Link>

      {error ? (
        <p className={styles.suggestionError} role="alert">
          {error}
        </p>
      ) : null}

      {inviting ? (
        <InviteDialog
          person={inviting}
          onClose={() => setInviting(null)}
          onSend={sendInvite}
        />
      ) : null}
    </>
  );
}
