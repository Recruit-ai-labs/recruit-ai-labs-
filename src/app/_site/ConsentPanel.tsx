"use client";

import Link from "next/link";
import { useEffect } from "react";

import CookiePrefsButton from "./CookiePrefsButton";
import { openConsentPreferences } from "./consent";
import styles from "./chrome.module.scss";

/**
 * The "change your mind" panel on the cookie notice. Split out as a client
 * component because the only interesting thing it does is reopen the
 * preferences dialog that lives in the layout.
 */
export default function ConsentPanel() {
  // Links elsewhere on the site point at /cookies#preferences. Landing on
  // that hash should do what the label promises, not just scroll.
  useEffect(() => {
    if (window.location.hash !== "#preferences") return;
    const timer = window.setTimeout(openConsentPreferences, 400);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section className={styles.prefsPanel} id="preferences">
      <p className={styles.glanceLabel}>Your choice</p>
      <h2 className={styles.prefsPanelTitle}>Changed your mind?</h2>
      <p className={styles.prefsPanelText}>
        Your choice is stored in this browser and stays valid for twelve
        months. Reopen the panel to switch a category on or off — the change
        applies immediately, and no reload is needed.
      </p>
      <div className={styles.prefsPanelActions}>
        <CookiePrefsButton label="Open cookie preferences" variant="pill" />
        <Link href="/data-rights" className={styles.docFootLink}>
          Ask us a data question
        </Link>
      </div>
    </section>
  );
}
