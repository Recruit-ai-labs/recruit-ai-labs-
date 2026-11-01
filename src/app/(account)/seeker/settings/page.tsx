import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { readAccount } from "@/lib/account";
import { completion } from "@/lib/seeker-profile";

import PendingLink, { ButtonSpinner } from "../../../_site/PendingLink";
import SignOutRow from "../../../_account/seeker/SignOutRow";
import styles from "../../../_account/seeker/seeker.module.scss";

export const metadata: Metadata = { title: "Settings" };

// ------------------------------------------------------------------
//  Settings.
//
//  Read-only for now, and deliberately so: this pass tells the truth
//  about the account instead of offering switches that do nothing. Every
//  row here is a fact already stored somewhere — Clerk for the address,
//  publicMetadata for the profile — and the two actions that exist are
//  the two that already work: leave the page for the profile, or sign
//  out for good.
//
//  Editing the values themselves is not missing, it is elsewhere: the
//  profile page carries a pencil on every section, so this page points at
//  it rather than opening a second copy of the same form.
//
//  The index on the left is real in-page navigation, not decoration: each
//  entry is an anchor to the card it names.
// ------------------------------------------------------------------

const SECTIONS = [
  { id: "account", label: "Account" },
  { id: "privacy", label: "Who can read what" },
  { id: "session", label: "Session" },
] as const;

export default async function SettingsPage() {
  const account = await readAccount();
  if (!account) redirect("/sign-in");

  const { percent } = completion(account.profile);
  const name = `${account.profile.firstName} ${account.profile.lastName}`.trim();

  return (
    <div className={styles.layoutSettings}>
      <nav className={styles.settingNav} aria-label="Settings sections">
        <p className={styles.settingNavTitle}>Settings</p>

        {SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className={styles.settingNavItem}
          >
            <span>{section.label}</span>
            <span aria-hidden="true">↓</span>
          </a>
        ))}
      </nav>

      <div className={styles.mainColumn}>
        <div>
          <h1 className={styles.pageTitle}>Settings</h1>
          <p className={styles.pageLede}>
            What the workspace keeps about you, what other people can read, and
            the way out. Each row is something that is already saved — nothing
            here is a switch that pretends to work.
          </p>
        </div>

        <section className={styles.card} id="account" aria-labelledby="settings-account">
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle} id="settings-account">
              Account
            </h2>
            <PendingLink
              href="/seeker/profile"
              className={styles.cardAction}
              pending={<ButtonSpinner />}
            >
              Open profile →
            </PendingLink>
          </div>

          <div className={styles.rows}>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Name</span>
              <span className={styles.rowValue}>{name || "Not set"}</span>
            </div>

            <div className={styles.row}>
              <span className={styles.rowLabel}>Username</span>
              <span className={styles.rowValue}>
                {account.profile.username
                  ? `@${account.profile.username}`
                  : "Not set"}
              </span>
            </div>

            <div className={styles.row}>
              <span className={styles.rowLabel}>Email</span>
              <span className={styles.rowValue}>{account.email}</span>
            </div>

            <div className={styles.row}>
              <span className={styles.rowLabel}>Signed in as</span>
              <span className={styles.rowValue}>Job seeker</span>
            </div>

            <div className={styles.row}>
              <span className={styles.rowLabel}>Profile</span>
              <span className={styles.rowValue}>{percent}% complete</span>
            </div>
          </div>

          <p className={styles.footNote}>
            Every value above comes from onboarding or from the account you
            signed in with. Changing them by hand happens on your profile: the
            pencil beside each heading opens that one section, and the name,
            headline and pictures are edited the same way.
          </p>
        </section>

        <section className={styles.card} id="privacy" aria-labelledby="settings-privacy">
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle} id="settings-privacy">
              Who can read what
            </h2>
            <span className={styles.cardNote}>Privacy</span>
          </div>

          <div className={styles.rows}>
            <div className={styles.row}>
              <span className={styles.rowLabel}>On your profile</span>
              <span className={styles.rowValue}>
                Name, username, headline, about, location, experience,
                education, skills and any links you added.
              </span>
            </div>

            <div className={styles.row}>
              <span className={styles.rowLabel}>Kept private</span>
              <span className={styles.rowValue}>
                Date of birth, phone number and email address.
              </span>
            </div>
          </div>

          <p className={styles.footNote}>
            Private fields exist for your account and for the person reviewing
            an application — they are never printed on your profile. The
            workspace is marked not to be indexed by search engines, and there
            is no public member directory.
          </p>

          <PendingLink
            href="/privacy"
            className={styles.linkRow}
            pending={<ButtonSpinner />}
          >
            Read the privacy notice
            <span className={styles.linkRowGo} aria-hidden="true">
              →
            </span>
          </PendingLink>

          <PendingLink
            href="/data-rights"
            className={styles.linkRow}
            pending={<ButtonSpinner />}
          >
            Your data rights — access, correction, deletion
            <span className={styles.linkRowGo} aria-hidden="true">
              →
            </span>
          </PendingLink>
        </section>

        <section className={styles.card} id="session" aria-labelledby="settings-session">
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle} id="settings-session">
              Session
            </h2>
            <span className={styles.cardNote}>{account.email}</span>
          </div>

          <p className={styles.cardText}>
            Signing out ends this session on this device. Nothing you have saved
            is deleted, and signing back in restores the profile exactly as it
            is now.
          </p>

          <SignOutRow />
        </section>

        <p className={styles.railNote}>
          Notification preferences, two-factor sign-in and connected accounts
          are not built yet. Each one appears here when it actually does
          something.
        </p>
      </div>
    </div>
  );
}
