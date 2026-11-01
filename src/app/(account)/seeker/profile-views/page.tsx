import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { readAccount } from "@/lib/account";
import { databaseConfigured } from "@/lib/db";
import { readProfileViews } from "@/lib/profile-views";
import { plural } from "@/lib/feed-types";

import PendingLink, { ButtonSpinner } from "../../../_site/PendingLink";
import { EyeIcon } from "../../../_account/seeker/Icons";
import PersonLine from "../../../_account/seeker/PersonLine";
import { visited } from "../../../_account/seeker/SeekerHome";
import styles from "../../../_account/seeker/seeker.module.scss";

export const metadata: Metadata = { title: "Profile viewers" };

// ------------------------------------------------------------------
//  Who viewed your profile.
//
//  The one private list a member is allowed to read about their own
//  reach: every person who has opened this profile, newest visit first,
//  with a count of how often each of them came back.
//
//  Two things are printed rather than one, because a member asks two
//  questions. "How many" is answered by the two figures at the top —
//  visits count repeats, members do not, and the difference between them
//  is the interesting part. "Who" is the list under it.
//
//  The page is server-rendered and read-only on purpose. A viewer cannot
//  be replied to from here without pretending they wanted a conversation,
//  so the row is a link to their profile and nothing more; the moves that
//  make sense — follow, connect, message — live on the page it opens.
// ------------------------------------------------------------------

/** A visit is not a person, and the two figures are not the same sentence. */
function about(views: number, readers: number) {
  if (!readers) return "No one has opened your profile yet.";

  const opening = `${plural(readers, "member")} ${
    readers === 1 ? "has" : "have"
  } opened your profile`;

  return views === readers
    ? `${opening}.`
    : `${opening} — ${plural(views, "visit", "visits")} between them.`;
}

export default async function ProfileViewsPage() {
  const account = await readAccount();
  if (!account) redirect("/sign-in");

  const online = databaseConfigured();

  const summary = online
    ? await readProfileViews(account.userId).catch(() => null)
    : null;

  return (
    <div className={styles.notificationsPage}>
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>Who viewed your profile</h1>
          <p className={styles.pageSub}>
            {summary
              ? about(summary.views, summary.readers)
              : "These figures could not be read just now. Writing and editing still work."}
          </p>
        </div>

        <PendingLink
          href="/seeker/profile"
          className={styles.socialButtonGhost}
          pending={<ButtonSpinner />}
        >
          View your profile
        </PendingLink>
      </header>

      {summary ? (
        <dl className={styles.activityGrid}>
          <div className={styles.activityCell}>
            <dt className={styles.activityLabel}>Views</dt>
            <dd className={styles.activityValue}>{summary.views}</dd>
          </div>

          <div className={styles.activityCell}>
            <dt className={styles.activityLabel}>Members</dt>
            <dd className={styles.activityValue}>{summary.readers}</dd>
          </div>
        </dl>
      ) : null}

      <section className={styles.socialCard} aria-label="Profile viewers list">
        {summary?.people.length ? (
          <ul className={styles.personList}>
            {summary.people.map((entry) => (
              <PersonLine
                key={entry.person.id}
                person={entry.person}
                note={
                  entry.visits > 1
                    ? `Viewed your profile ${plural(entry.visits, "time", "times")} · ${visited(entry.seen)}`
                    : `Viewed your profile · ${visited(entry.seen)}`
                }
              />
            ))}
          </ul>
        ) : (
          <div className={styles.noticeEmpty}>
            <EyeIcon className={styles.noticeEmptyIcon} />
            <p className={styles.noticeEmptyTitle}>
              {summary ? "No viewers yet" : "Nothing to show"}
            </p>
            <p className={styles.noticeEmptyText}>
              {summary
                ? "This list fills as other members open your profile. Posting, and being suggested to people, is what puts a profile in front of someone — your own visits never count."
                : "The viewer list could not be read just now. Try again in a moment."}
            </p>
          </div>
        )}
      </section>

      <p className={styles.railNote}>
        Only you can read this list, and only for your own profile. Opening
        your own profile never counts, and a person who comes back ten times
        stays one row — the visits figure is what grows. The time beside each
        name is their most recent look, not their first.
      </p>
    </div>
  );
}
