"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { plural, timeAgo, type FeedPost } from "@/lib/feed-types";
import type { ConnectionState, PublicProfile } from "@/lib/social-types";

import {
  BriefcaseIcon,
  CheckIcon,
  GlobeIcon,
  GraduationIcon,
  LockIcon,
  PinIcon,
  UsersIcon,
} from "./Icons";
import PersonAvatar, { type AvatarPerson } from "./PersonAvatar";
import InviteDialog from "./InviteDialog";
import styles from "./seeker.module.scss";
import { messageOf, postJson } from "./social-client";

// ------------------------------------------------------------------
//  Someone else's profile.
//
//  The hero is public: cover, face, name, headline, where they work from
//  and three counters. Everything under it — about, experience, education,
//  skills, links — is behind the lock until the reader connects or
//  follows. The lock is enforced by the server (the detail is never sent),
//  so this component only decides whether to draw the content or the
//  promise of it.
//
//  Every write answers with the reader's new standing. When that standing
//  opens the profile, the page is asked to re-render — which is the only
//  way the hidden sections can arrive, because they were never in the
//  first payload.
// ------------------------------------------------------------------

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2024-03" → "Mar 2024"; anything else as written. */
function when(value: string) {
  const [year, month] = value.split("-");
  if (!year) return "";

  const index = Number(month) - 1;
  return MONTHS[index] ? `${MONTHS[index]} ${year}` : year;
}

function span(start: string, end: string, current: boolean) {
  if (!start && !end) return current ? "Present" : "";

  return `${start ? when(start) : "—"} — ${current ? "Present" : end ? when(end) : ""}`;
}

/** Plain words, with links and @mentions that go somewhere. */
function Body({ text, mentions }: { text: string; mentions: FeedPost["mentions"] }) {
  const usernames = new Set(mentions.map((mention) => mention.username.toLowerCase()));
  const parts = text.split(/(https?:\/\/[^\s<>"]+|@[a-z][a-z0-9_]{2,29}|#[\p{L}\p{N}_]{2,})/giu);

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

        if (/^@[a-z][a-z0-9_]{2,29}$/i.test(part) && usernames.has(part.slice(1).toLowerCase())) {
          const mention = mentions.find(
            (entry) => entry.username.toLowerCase() === part.slice(1).toLowerCase(),
          );

          return mention ? (
            <Link key={index} className={styles.postMention} href={`/seeker/people/${mention.id}`}>
              {part}
            </Link>
          ) : (
            part
          );
        }

        if (/^#[\p{L}\p{N}_]{2,}$/u.test(part)) {
          return (
            <span key={index} className={styles.tag}>
              {part}
            </span>
          );
        }

        return part;
      })}
    </>
  );
}

export default function PublicProfileView({
  profile,
  posts,
  viewer,
}: {
  profile: PublicProfile;
  posts: FeedPost[];
  viewer: AvatarPerson & { id: string; username: string; headline: string };
}) {
  const router = useRouter();

  const [state, setState] = useState<ConnectionState>(profile.state);
  const [following, setFollowing] = useState(profile.following);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);
  // Connecting on a fresh profile opens the invite-with-note dialog; an
  // incoming invitation is still accepted with one click, so this only
  // covers the "send an invitation" half of what `connect` used to do.
  const [inviting, setInviting] = useState(false);

  const person = profile.person;
  const locked = profile.locked && state !== "connected" && !following;

  /** A connection or a follow opens the rest of the page. */
  function refreshIf(opened: boolean) {
    if (opened && locked) router.refresh();
  }

  /** Accept an invitation that is already waiting. */
  async function connect() {
    if (busy) return;

    setBusy(true);
    setError("");

    try {
      const data = await postJson<{ state: ConnectionState }>("/api/connections", {
        personId: person.id,
        action: "accept",
      });

      setState(data.state);
      refreshIf(data.state === "connected");
    } catch (problem) {
      setError(messageOf(problem));
    } finally {
      setBusy(false);
    }
  }

  /**
   * Send the invitation the dialog collected, with its optional note.
   *
   * Throws on failure so `InviteDialog` stays open and the note survives a
   * retry. On success it settles the same standing `connect` would.
   */
  async function sendInvite(note: string) {
    const data = await postJson<{ state: ConnectionState }>("/api/connections", {
      personId: person.id,
      action: "invite",
      ...(note ? { note } : {}),
    });

    setState(data.state);
    refreshIf(data.state === "connected");
  }

  async function withdraw() {
    if (busy) return;

    setBusy(true);
    setError("");

    try {
      const data = await postJson<{ state: ConnectionState }>("/api/connections", {
        personId: person.id,
        action: state === "incoming" ? "decline" : "withdraw",
      });

      setState(data.state);
    } catch (problem) {
      setError(messageOf(problem));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (busy) return;

    setBusy(true);
    setError("");

    try {
      const data = await postJson<{ state: ConnectionState }>("/api/connections", {
        personId: person.id,
        action: "remove",
      });

      setState(data.state);
      setConfirmRemove(false);
      router.refresh();
    } catch (problem) {
      setError(messageOf(problem));
    } finally {
      setBusy(false);
    }
  }

  async function follow() {
    if (busy) return;

    const next = !following;
    setBusy(true);
    setError("");
    setFollowing(next);

    try {
      const data = await postJson<{ following: boolean }>(
        `/api/people/${encodeURIComponent(person.id)}/follow`,
        { follow: next },
      );

      setFollowing(data.following);
      refreshIf(data.following);
    } catch (problem) {
      setFollowing(!next);
      setError(messageOf(problem));
    } finally {
      setBusy(false);
    }
  }

  const meta = [person.city, person.username ? `@${person.username}` : ""]
    .filter(Boolean)
    .join(" · ");

  const self = state === "self";

  return (
    <div className={styles.layoutProfile}>
      <div className={styles.mainColumn}>
        <section className={styles.profileHero} aria-labelledby="public-name">
          <div className={styles.heroCover}>
            {profile.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.heroCoverImg} src={profile.cover} alt="" />
            ) : (
              <span className={styles.heroPattern} aria-hidden="true" />
            )}
          </div>

          <div className={styles.heroBody}>
            <div className={styles.heroPhoto}>
              <PersonAvatar
                person={{ firstName: "", lastName: "", name: person.name }}
                src={person.photo}
                hero
                className={styles.profileAvatar}
              />
            </div>

            <div className={styles.heroText}>
              <h1 className={styles.heroTitle} id="public-name">
                {person.name}
                {profile.following && !self ? (
                  <span className={styles.heroFollowChip}>Following</span>
                ) : null}
              </h1>

              <p className={styles.heroHeadline}>
                {person.headline || "No headline yet."}
              </p>

              <p className={styles.heroMeta}>
                {meta ? <span>{meta}</span> : null}
                <span>
                  {person.mutual > 0
                    ? `${person.mutual} mutual ${plural(person.mutual, "connection")}`
                    : "No mutual connections yet"}
                </span>
              </p>

              <dl className={styles.heroCounts}>
                <div>
                  <dt>Connections</dt>
                  <dd>{profile.counts.connections}</dd>
                </div>
                <div>
                  <dt>Followers</dt>
                  <dd>{profile.counts.followers}</dd>
                </div>
                <div>
                  <dt>Posts</dt>
                  <dd>{profile.counts.posts}</dd>
                </div>
              </dl>
            </div>

            <div className={styles.heroActions}>
              {self ? (
                <>
                  <Link href="/seeker/profile" className={styles.socialButtonSolid}>
                    Edit your profile
                  </Link>
                  <Link href="/seeker/network" className={styles.socialButtonGhost}>
                    Your network
                  </Link>
                </>
              ) : (
                <>
                  {state === "connected" ? (
                    <Link
                      href={`/seeker/messages?with=${encodeURIComponent(person.id)}`}
                      className={styles.socialButtonSolid}
                    >
                      Message
                    </Link>
                  ) : state === "outgoing" ? (
                    <button
                      type="button"
                      className={styles.socialButtonQuiet}
                      onClick={() => void withdraw()}
                      disabled={busy}
                      title="Withdraw this invitation"
                    >
                      <CheckIcon className={styles.buttonIcon} />
                      Pending
                    </button>
                  ) : state === "incoming" ? (
                    <button
                      type="button"
                      className={styles.socialButtonSolid}
                      onClick={() => void connect()}
                      disabled={busy}
                    >
                      {busy ? "…" : "Accept invitation"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={styles.socialButtonSolid}
                      onClick={() => setInviting(true)}
                      disabled={busy}
                    >
                      {busy ? "…" : "Connect"}
                    </button>
                  )}

                  <button
                    type="button"
                    className={following ? styles.socialButtonQuiet : styles.socialButton}
                    onClick={() => void follow()}
                    disabled={busy}
                    aria-pressed={following}
                  >
                    {following ? "Following" : "Follow"}
                  </button>

                  <Link
                    href={`/seeker/messages?with=${encodeURIComponent(person.id)}`}
                    className={styles.socialButtonGhost}
                  >
                    Message
                  </Link>
                </>
              )}
            </div>
          </div>

          {state === "connected" ? (
            <div className={styles.heroFoot}>
              <span className={styles.heroFootNote}>
                <UsersIcon className={styles.shortcutIcon} />
                You are connected — each of you is in the other&apos;s Following
                tab.
              </span>

              {confirmRemove ? (
                <span className={styles.heroFootConfirm}>
                  Remove this connection?
                  <button
                    type="button"
                    className={styles.heroFootDanger}
                    onClick={() => void remove()}
                    disabled={busy}
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    className={styles.heroFootCancel}
                    onClick={() => setConfirmRemove(false)}
                  >
                    Keep
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  className={styles.heroFootLink}
                  onClick={() => setConfirmRemove(true)}
                >
                  Remove connection
                </button>
              )}
            </div>
          ) : null}

          {error ? (
            <p className={styles.cardError} role="alert">
              {error}
              <button type="button" className={styles.cardErrorClose} onClick={() => setError("")}>
                Dismiss
              </button>
            </p>
          ) : null}
        </section>

        {locked ? (
          <section className={styles.lockCard} aria-label="Profile locked">
            <span className={styles.lockMark}>
              <LockIcon className={styles.lockIcon} />
            </span>

            <h2 className={styles.lockTitle}>This profile is private for now</h2>

            <p className={styles.lockText}>
              {person.name.split(" ")[0]} opens their about, experience,
              education, skills and links to people they are connected with or
              who follow them. Connect or follow to read the whole profile.
            </p>

            <div className={styles.lockActions}>
              {state === "incoming" ? (
                <button
                  type="button"
                  className={styles.socialButtonSolid}
                  onClick={() => void connect()}
                  disabled={busy}
                >
                  {busy ? "…" : "Accept their invitation"}
                </button>
              ) : state === "outgoing" ? (
                <span className={styles.lockNote}>Invitation sent — waiting on their answer.</span>
              ) : (
                <button
                  type="button"
                  className={styles.socialButtonSolid}
                  onClick={() => setInviting(true)}
                  disabled={busy}
                >
                  {busy ? "…" : "Connect"}
                </button>
              )}

              <button
                type="button"
                className={following ? styles.socialButtonQuiet : styles.socialButton}
                onClick={() => void follow()}
                disabled={busy}
              >
                {following ? "Following" : "Follow"}
              </button>
            </div>

            <ul className={styles.lockList}>
              <li>About</li>
              <li>Experience</li>
              <li>Education</li>
              <li>Skills</li>
              <li>Links</li>
            </ul>
          </section>
        ) : (
          <>
            <section className={styles.card} aria-labelledby="public-about">
              <div className={styles.cardHead}>
                <h2 className={styles.cardTitle} id="public-about">
                  About
                </h2>
              </div>

              {profile.about ? (
                <p className={styles.cardText}>{profile.about}</p>
              ) : (
                <p className={styles.emptyLine}>Nothing written here yet.</p>
              )}
            </section>

            <section className={styles.card} aria-labelledby="public-experience">
              <div className={styles.cardHead}>
                <h2 className={styles.cardTitle} id="public-experience">
                  Experience
                </h2>
                <span className={styles.cardNote}>
                  {profile.experience.length
                    ? `${profile.experience.length} ${
                        profile.experience.length === 1 ? "entry" : "entries"
                      }`
                    : "None"}
                </span>
              </div>

              {profile.experience.length ? (
                <ol className={styles.entryList}>
                  {profile.experience.map((entry, index) => (
                    <li className={styles.entry} key={`${entry.company}-${index}`}>
                      <span className={styles.entryMark} aria-hidden="true">
                        {entry.company.trim().charAt(0).toUpperCase() || "·"}
                      </span>

                      <div>
                        <h3 className={styles.entryTitle}>{entry.title}</h3>
                        <p className={styles.entryMeta}>
                          {[entry.company, entry.employmentType].filter(Boolean).join(" · ")}
                        </p>
                        <p className={styles.entryDates}>
                          {span(entry.start, entry.end, entry.current)}
                          {entry.location ? ` · ${entry.location}` : ""}
                        </p>
                        {entry.description ? (
                          <p className={styles.entryText}>{entry.description}</p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className={styles.emptyLine}>No experience listed.</p>
              )}
            </section>

            <section className={styles.card} aria-labelledby="public-education">
              <div className={styles.cardHead}>
                <h2 className={styles.cardTitle} id="public-education">
                  Education
                </h2>
                <span className={styles.cardNote}>
                  {profile.education.length
                    ? `${profile.education.length} ${
                        profile.education.length === 1 ? "entry" : "entries"
                      }`
                    : "None"}
                </span>
              </div>

              {profile.education.length ? (
                <ol className={styles.entryList}>
                  {profile.education.map((entry, index) => (
                    <li className={styles.entry} key={`${entry.college}-${index}`}>
                      <span className={styles.entryMark} aria-hidden="true">
                        {entry.college.trim().charAt(0).toUpperCase() || "·"}
                      </span>

                      <div>
                        <h3 className={styles.entryTitle}>{entry.college}</h3>
                        <p className={styles.entryMeta}>
                          {[entry.course, entry.speciality].filter(Boolean).join(" · ")}
                        </p>
                        <p className={styles.entryDates}>
                          {entry.startYear ? `${entry.startYear} — ` : ""}
                          {entry.endYear}
                          {entry.current ? " · Currently studying" : ""}
                          {entry.grade ? ` · ${entry.grade}` : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className={styles.emptyLine}>No education listed.</p>
              )}
            </section>

            <section className={styles.card} aria-labelledby="public-skills">
              <div className={styles.cardHead}>
                <h2 className={styles.cardTitle} id="public-skills">
                  Skills
                </h2>
                <span className={styles.cardNote}>{profile.skills.length || "None"}</span>
              </div>

              {profile.skills.length ? (
                <ul className={styles.chips}>
                  {profile.skills.map((skill) => (
                    <li className={styles.chip} key={skill.name}>
                      {skill.name}
                      {skill.level ? <span className={styles.chipLevel}>{skill.level}</span> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.emptyLine}>No skills listed.</p>
              )}
            </section>

            {profile.links.website || profile.links.linkedin || profile.links.github ? (
              <section className={styles.card} aria-labelledby="public-links">
                <div className={styles.cardHead}>
                  <h2 className={styles.cardTitle} id="public-links">
                    Links
                  </h2>
                </div>

                <div className={styles.rows}>
                  {[
                    { key: "website", label: "Portfolio", value: profile.links.website },
                    { key: "linkedin", label: "LinkedIn", value: profile.links.linkedin },
                    { key: "github", label: "GitHub", value: profile.links.github },
                  ]
                    .filter((link) => Boolean(link.value))
                    .map((link) => (
                      <div className={styles.row} key={link.key}>
                        <span className={styles.rowLabel}>{link.label}</span>
                        <span className={styles.rowValue}>
                          <a href={link.value} target="_blank" rel="noreferrer noopener">
                            {link.value.replace(/^https?:\/\//i, "").replace(/\/+$/, "")}
                          </a>
                        </span>
                      </div>
                    ))}
                </div>
              </section>
            ) : null}
          </>
        )}

        {!locked && posts.length ? (
          <section className={styles.card} aria-labelledby="public-posts">
            <div className={styles.cardHead}>
              <h2 className={styles.cardTitle} id="public-posts">
                Recent posts
              </h2>
              <span className={styles.cardNote}>
                {plural(profile.counts.posts, "post")}
              </span>
            </div>

            <ul className={styles.profilePostList}>
              {posts.map((post) => (
                <li className={styles.profilePost} key={post.id}>
                  <p className={styles.profilePostBody}>
                    <Body text={post.body} mentions={post.mentions} />
                  </p>

                  {post.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      className={styles.profilePostImage}
                      src={post.image}
                      alt=""
                      loading="lazy"
                    />
                  ) : null}

                  <p className={styles.profilePostMeta}>
                    <time dateTime={new Date(post.created).toISOString()}>
                      {timeAgo(post.created)}
                    </time>
                    <span aria-hidden="true">·</span>
                    {plural(post.likes, "like")}
                    <span aria-hidden="true">·</span>
                    {plural(post.comments, "comment")}
                    <span aria-hidden="true">·</span>
                    <Link href={`/seeker#post-${post.id}`} className={styles.profilePostLink}>
                      Open in feed
                    </Link>
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <aside className={styles.railRight}>
        <section className={styles.railCard} aria-labelledby="public-mutual">
          <div className={styles.railHead}>
            <h2 className={styles.railTitle} id="public-mutual">
              Mutual connections
            </h2>
            <span className={styles.railChip}>{profile.mutual.length}</span>
          </div>

          {profile.mutual.length ? (
            <ul className={styles.personList}>
              {profile.mutual.map((entry) => (
                <li className={styles.mutualRow} key={entry.id}>
                  <Link href={`/seeker/people/${entry.id}`} className={styles.mutualLink}>
                    <PersonAvatar person={{ firstName: "", lastName: "", name: entry.name }} src={entry.photo} />
                    <span>
                      <strong>{entry.name}</strong>
                      <span>{entry.headline || "On Recruit AI"}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.railNote}>
              No shared connections yet. The network tab is where those appear
              as your graph grows.
            </p>
          )}

          <Link href="/seeker/network" className={styles.viewRow}>
            <UsersIcon className={styles.shortcutIcon} />
            <span>Open My Network</span>
          </Link>
        </section>

        <section className={styles.railCard} aria-labelledby="public-details">
          <h2 className={styles.railTitle} id="public-details">
            At a glance
          </h2>

          <div className={styles.rows}>
            {person.city ? (
              <div className={styles.row}>
                <span className={styles.rowLabel}>Location</span>
                <span className={styles.rowValue}>
                  <PinIcon className={styles.tileIcon} />
                  {person.city}
                </span>
              </div>
            ) : null}

            <div className={styles.row}>
              <span className={styles.rowLabel}>Profile</span>
              <span className={styles.rowValue}>{locked ? "Locked" : "Open to you"}</span>
            </div>

            <div className={styles.row}>
              <span className={styles.rowLabel}>Member</span>
              <span className={styles.rowValue}>{person.username ? `@${person.username}` : "Recruit AI"}</span>
            </div>
          </div>

          {locked ? (
            <p className={styles.lockRailNote}>
              <LockIcon className={styles.lockRailIcon} />
              Connect or follow to see the rest.
            </p>
          ) : (
            <p className={styles.railNote}>
              {viewer.username
                ? `You are reading this as @${viewer.username}.`
                : "You are reading this as a member of the workspace."}
            </p>
          )}
        </section>

        <section className={styles.railCard} aria-labelledby="public-write">
          <h2 className={styles.railTitle} id="public-write">
            Say hello
          </h2>

          <p className={styles.railNote}>
            A message goes to their inbox and rings the bell. It does not need a
            connection.
          </p>

          <Link
            href={`/seeker/messages?with=${encodeURIComponent(person.id)}`}
            className={styles.viewRow}
          >
            <GlobeIcon className={styles.shortcutIcon} />
            <span>Message {person.name.split(" ")[0]}</span>
          </Link>

          <Link href="/seeker" className={styles.viewRow}>
            <BriefcaseIcon className={styles.shortcutIcon} />
            <span>Back to your feed</span>
          </Link>
        </section>

        {!locked && profile.skills.length ? (
          <p className={styles.railNote}>
            <GraduationIcon className={styles.tileIcon} /> Skills are self-declared
            and never presented as a test result.
          </p>
        ) : null}
      </aside>

      {inviting ? (
        <InviteDialog
          person={person}
          onClose={() => setInviting(false)}
          onSend={sendInvite}
        />
      ) : null}
    </div>
  );
}
