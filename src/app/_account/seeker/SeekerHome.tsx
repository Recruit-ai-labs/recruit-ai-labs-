import PendingLink, { ButtonSpinner } from "@/app/_site/PendingLink";

import type { FeedActivity, FeedPage } from "@/lib/feed-types";
import { plural, timeAgo } from "@/lib/feed-types";
import type { PersonCard, ProfileViewSummary } from "@/lib/social-types";

import Feed from "./Feed";
import { PencilIcon, ShieldIcon, SlidersIcon, UserIcon } from "./Icons";
import PeopleRail from "./PeopleRail";
import PersonAvatar, { type AvatarPerson } from "./PersonAvatar";
import PersonLine from "./PersonLine";
import styles from "./seeker.module.scss";

// ------------------------------------------------------------------
//  The job seeker home.
//
//  Three columns, the shape LinkedIn settled on and the reference
//  workspace already used: who you are, what is being said, and what is
//  worth acting on. The middle column is the product — a live feed with a
//  composer at the top. The rails do quiet work either side of it.
//
//  The profile card is one link. It used to be a card with a link inside
//  it, which meant most of the card did nothing when clicked; now the
//  cover, the name, the strength bar and the arrow all go to the profile,
//  and the arrow is decoration rather than a second control.
//
//  Everything here is server-rendered from the account, so the card in
//  the rail, the numbers under it and the feed's own author never
//  disagree.
//
//  The viewers card is the one number in the rail that is read rather than
//  written: it appears only when somebody has actually opened the profile,
//  because a zero beside "Who viewed your profile" invites the reader to
//  doubt the count instead of visiting the page that names the faces.
// ------------------------------------------------------------------

export type HomeViewer = AvatarPerson & {
  id: string;
  username: string;
  headline: string;
  location: string;
  /** Profile completion, 0–100. */
  percent: number;
  /** The uploaded portrait and cover, when the person has added them. */
  photo?: string | null;
  cover?: string | null;
};

type Props = {
  viewer: HomeViewer;
  feed: FeedPage;
  activity: FeedActivity;
  /** Second-degree people, with how many connections they share. */
  suggestions: PersonCard[];
  /** Invitations waiting on the reader. */
  invitations?: number;
  /**
   * Who has opened this profile, and how often.
   *
   * Optional and allowed to be null: the count is read beside the feed, and a
   * database that cannot answer costs the rail one card, not the home.
   */
  viewers?: ProfileViewSummary | null;
  /** The feed could not be read; the composer still works. */
  feedOffline?: boolean;
};

const SHORTCUTS = [
  { href: "/seeker/profile", label: "Your profile", Icon: UserIcon },
  { href: "/seeker/settings", label: "Settings & privacy", Icon: SlidersIcon },
  { href: "/data-rights", label: "Data rights", Icon: ShieldIcon },
] as const;

const ACTIVITY = [
  { key: "posts", label: "Posts" },
  { key: "reactions", label: "Likes" },
  { key: "comments", label: "Replies" },
  { key: "followers", label: "Followers" },
] as const;

/**
 * The stamp on a viewer's row, in the words a list of people needs.
 *
 * `timeAgo` answers "how old is this", which reads as an accusation on a
 * person — "3m" beside a name says nothing about when they called. "3m ago"
 * and "today" place the visit in time instead.
 */
export function visited(created: number) {
  const age = timeAgo(created);

  return age === "now" ? "today" : `${age} ago`;
}

export default function SeekerHome({
  viewer,
  feed,
  activity,
  suggestions,
  invitations = 0,
  viewers = null,
  feedOffline = false,
}: Props) {
  const name = `${viewer.firstName} ${viewer.lastName}`.trim();
  const firstName = viewer.firstName || "there";

  return (
    <div className={styles.layout}>
      {/* ------------------------------------------------ profile rail */}
      <aside className={styles.railLeft}>
        <article className={styles.profileCard}>
          <PendingLink
            href="/seeker/profile"
            className={styles.profileCardLink}
            aria-label="Open your profile"
          >
            <div className={styles.cover}>
              {viewer.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className={styles.coverImg} src={viewer.cover} alt="" />
              ) : (
                <span className={styles.coverPattern} aria-hidden="true" />
              )}
            </div>

            <div className={styles.profileCardBody}>
              {/* One size declaration only: the rail's disc is placed, not
                  hero-sized, so the two never fight over the cascade. */}
              <PersonAvatar
                person={viewer}
                src={viewer.photo}
                className={styles.profileCardAvatar}
              />

              <h2 className={styles.profileName}>{name || "Your profile"}</h2>

              <p className={styles.profileHeadline}>
                {viewer.headline || "Add a headline — the one line people read first."}
              </p>

              <p className={styles.profileMeta}>
                {[viewer.location, viewer.username ? `@${viewer.username}` : ""]
                  .filter(Boolean)
                  .join(" · ") || "Location and username not set"}
              </p>

              <div className={styles.strengthRow}>
                <span>Profile strength</span>
                <span className={styles.strengthValue}>{viewer.percent}%</span>
              </div>

              <div
                className={styles.strengthBar}
                role="progressbar"
                aria-valuenow={viewer.percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Profile completion"
              >
                <span
                  className={styles.strengthFill}
                  style={{ transform: `scaleX(${viewer.percent / 100})` }}
                />
              </div>

              <span className={styles.profileCardGo}>
                <span>View your profile</span>
                <span aria-hidden="true">→</span>
              </span>
            </div>
          </PendingLink>
        </article>

        <nav className={styles.shortcuts} aria-label="Shortcuts">
          {SHORTCUTS.map(({ href, label, Icon }) => (
            <PendingLink
              key={href}
              href={href}
              className={styles.shortcutRow}
              pending={<ButtonSpinner />}
            >
              <Icon className={styles.shortcutIcon} />
              <span>{label}</span>
              <span className={styles.shortcutGo} aria-hidden="true">
                →
              </span>
            </PendingLink>
          ))}
        </nav>
      </aside>

      {/* ------------------------------------------------------- feed */}
      <div className={styles.mainColumn}>
        {feedOffline ? (
          <p className={styles.feedError} role="alert">
            The feed could not be read just now. Writing still works; refresh
            to try the list again.
          </p>
        ) : null}

        <Feed
          viewer={{
            id: viewer.id,
            firstName: viewer.firstName,
            lastName: viewer.lastName,
            email: viewer.email ?? "",
            username: viewer.username,
            headline: viewer.headline,
          }}
          initial={feed}
        />
      </div>

      {/* ------------------------------------------------- context rail */}
      <aside className={styles.railRight}>
        <section className={styles.railCard} aria-labelledby="home-activity">
          <div className={styles.railHead}>
            <h2 className={styles.railTitle} id="home-activity">
              Your activity
            </h2>
            <span className={styles.railChip}>Private</span>
          </div>

          {/* A definition list, so the figure and its name travel together
              for a screen reader; on screen each is one line — name on the
              left, the figure on the right. */}
          <dl className={styles.activityGrid}>
            {ACTIVITY.map(({ key, label }) => (
              <div className={styles.activityCell} key={key}>
                <dt className={styles.activityLabel}>{label}</dt>
                <dd className={styles.activityValue}>{activity[key]}</dd>
              </div>
            ))}
          </dl>
        </section>

        {viewers?.people.length ? (
          <section className={styles.railCard} aria-labelledby="home-viewers">
            <div className={styles.railHead}>
              <h2 className={styles.railTitle} id="home-viewers">
                Who viewed your profile
              </h2>
              <PendingLink
                href="/seeker/profile-views"
                className={styles.cardAction}
                pending={<ButtonSpinner />}
              >
                See all
              </PendingLink>
            </div>

            {/* The newest three faces, each with the day they arrived. Three
                is what a rail can hold without pushing the suggestions the
                reader can still act on below the fold. */}
            <ul className={styles.personList}>
              {viewers.people.slice(0, 3).map((entry) => (
                <PersonLine
                  key={entry.person.id}
                  person={entry.person}
                  note={`${plural(entry.visits, "visit", "visits")} · ${visited(
                    entry.seen,
                  )}`}
                />
              ))}
            </ul>

            <p className={styles.viewerTotal}>
              {plural(viewers.readers, "member", "members")} have opened your
              profile
              {viewers.views > viewers.readers
                ? ` — ${plural(viewers.views, "visit", "visits")} in all`
                : ""}
              .
            </p>
          </section>
        ) : null}

        <section className={styles.railCard} aria-labelledby="home-people">
          <div className={styles.railHead}>
            <h2 className={styles.railTitle} id="home-people">
              People you may know
            </h2>
            <PendingLink
              href="/seeker/network"
              className={styles.cardAction}
              pending={<ButtonSpinner />}
            >
              See all
            </PendingLink>
          </div>

          {suggestions.length || invitations ? (
            <PeopleRail people={suggestions} invitations={invitations} />
          ) : (
            <p className={styles.railNote}>
              No one else is here yet. As members join and connections are made,
              the people your network knows show up here — with the reason they
              were suggested.
            </p>
          )}
        </section>

        <section className={styles.railCard} aria-labelledby="home-next">
          <h2 className={styles.railTitle} id="home-next">
            Make your profile work
          </h2>

          <p className={styles.railNote}>
            A headline, two skills and one line of experience are enough for a
            recruiter to place you. Everything you add stays private until you
            apply.
          </p>

          <PendingLink
            href="/seeker/profile"
            className={styles.viewRow}
            pending={<ButtonSpinner />}
          >
            <PencilIcon className={styles.shortcutIcon} />
            <span>Open your profile</span>
          </PendingLink>
        </section>

        <p className={styles.railNote}>
          Welcome back, {firstName}. Your date of birth, phone number and email
          are never shown on your profile.
        </p>
      </aside>
    </div>
  );
}
