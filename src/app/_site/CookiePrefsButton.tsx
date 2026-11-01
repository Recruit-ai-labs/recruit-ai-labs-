"use client";

import { openConsentPreferences } from "./consent";
import styles from "./chrome.module.scss";

/**
 * The "Cookie preferences" control. It lives in the footer so the choice
 * can be revisited on any page, long after the first notice was dismissed.
 */
export default function CookiePrefsButton({
  label = "Cookie preferences",
  variant = "plain",
}: {
  label?: string;
  /** `pill` is for the cookie notice's own panel; the footer uses `plain`. */
  variant?: "plain" | "pill";
}) {
  return (
    <button
      type="button"
      className={variant === "pill" ? styles.prefsPill : styles.footerButton}
      onClick={openConsentPreferences}
    >
      {label}
    </button>
  );
}
