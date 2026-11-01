"use client";

import { useState } from "react";

import styles from "./account.module.scss";
import SignOutButton, { BrandMark } from "./SignOutButton";

const SEEKER_POINTS = [
  "A profile that shows the person, not just the keywords",
  "Education, skills and experience in one place",
  "Private by default — you decide what is shared",
];

const EMPLOYER_POINTS = [
  "A hiring workspace for your team",
  "Job posts, interviews and candidate notes",
  "Opens after approval",
];

/**
 * The fork after sign-in: job seeker or employer.
 *
 * Only the seeker card is live. The employer card stays visible so the
 * page still reads as a choice, but it is a disabled button rather than a
 * route into something half-built.
 */
export default function RoleChoice({ email }: { email: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function chooseSeeker() {
    if (busy) return;

    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/account/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "seeker" }),
      });
      const result = (await response.json()) as {
        redirect?: string;
        error?: string;
      };

      if (!response.ok || !result.redirect) {
        throw new Error(result.error ?? "Could not open your account.");
      }

      // A full load rather than a client navigation: the destination asks
      // the server who is signed in, and the fresh request carries the
      // role that was just written.
      window.location.assign(result.redirect);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not open your account.",
      );
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <BrandMark />
        <div className={styles.account}>
          <span>{email}</span>
          <SignOutButton />
        </div>
      </header>

      <div className={styles.choiceWrap}>
        <span className={styles.eyebrow}>Your next chapter</span>
        <h1 className={styles.choiceTitle}>What brings you here?</h1>
        <p className={styles.choiceLede}>
          One platform. Two ways forward.
        </p>

        <div className={styles.choices}>
          <section className={styles.choice} aria-labelledby="choice-seeker">
            <span className={styles.tag}>Free account</span>
            <h2 id="choice-seeker" className={styles.choiceHeading}>
              I&rsquo;m a job seeker
            </h2>
            <p className={styles.choiceText}>
              Build a profile you can keep coming back to, and take the next
              step with it.
            </p>
            <ul className={styles.points}>
              {SEEKER_POINTS.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            <div className={styles.choiceFoot}>
              <button
                type="button"
                className={styles.choiceCta}
                onClick={chooseSeeker}
                disabled={busy}
              >
                {busy ? "Opening your account…" : "Build my profile"}
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </section>

          <section
            className={`${styles.choice} ${styles.choiceMuted}`}
            aria-labelledby="choice-employer"
          >
            <span className={`${styles.tag} ${styles.tagMuted}`}>
              Coming soon
            </span>
            <h2 id="choice-employer" className={styles.choiceHeading}>
              I&rsquo;m an employer
            </h2>
            <p className={styles.choiceText}>
              Hiring workspaces open after approval. This side is not built yet.
            </p>
            <ul className={styles.points}>
              {EMPLOYER_POINTS.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            <div className={styles.choiceFoot}>
              <span className={styles.choiceCtaOff} aria-disabled="true">
                Not available yet
                <span aria-hidden="true">—</span>
              </span>
            </div>
          </section>
        </div>

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        <p className={styles.footNote}>
          Job seeker accounts start immediately. Employer workspaces open
          later.
        </p>
      </div>
    </main>
  );
}
