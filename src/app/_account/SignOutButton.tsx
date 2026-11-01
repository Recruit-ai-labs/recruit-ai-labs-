"use client";

import Link from "next/link";
import { useClerk } from "@clerk/nextjs";

import styles from "./account.module.scss";

/**
 * Leaves the session and returns to the sign-in panel. Used on the
 * choose-account screen and in the seeker header: both are places where
 * "this is the wrong account" should be one click away.
 */
export default function SignOutButton() {
  const { signOut } = useClerk();

  return (
    <button
      type="button"
      className={styles.signOut}
      onClick={() => signOut({ redirectUrl: "/sign-in" })}
    >
      Sign out
    </button>
  );
}

/** The wordmark, shared by every signed-in page. */
export function BrandMark() {
  return (
    <Link href="/" className={styles.brand} aria-label="Recruit AI — home">
      <span className={styles.brandRoman}>Recruit</span>
      <span className={styles.brandAI}>AI</span>
      <sup className={styles.brandTm}>TM</sup>
    </Link>
  );
}
