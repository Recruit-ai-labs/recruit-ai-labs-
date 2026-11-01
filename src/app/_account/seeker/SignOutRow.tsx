"use client";

import { useState } from "react";
import { useClerk } from "@clerk/nextjs";

import styles from "./seeker.module.scss";

// ------------------------------------------------------------------
//  Sign out, as a settings row.
//
//  The same action as the Me menu, placed where a person actually looks
//  for it: the page that lists everything else about their account. The
//  redirect goes to /sign-in rather than the marketing page, so leaving
//  the workspace and arriving back at it start in the same place.
//
//  No confirmation dialog — signing out costs nothing and is one click
//  from being undone, so the button reports progress instead of asking a
//  question.
// ------------------------------------------------------------------

export default function SignOutRow() {
  const { signOut } = useClerk();
  const [leaving, setLeaving] = useState(false);

  async function leave() {
    if (leaving) return;

    setLeaving(true);
    try {
      await signOut({ redirectUrl: "/sign-in" });
    } catch {
      // Clerk keeps the session if the call fails; the row becomes usable
      // again rather than leaving a dead button behind.
      setLeaving(false);
    }
  }

  return (
    <button
      type="button"
      className={styles.linkButton}
      onClick={leave}
      disabled={leaving}
    >
      {leaving ? "Signing out…" : "Sign out of this device"}
      <span className={styles.linkRowGo} aria-hidden="true">
        →
      </span>
    </button>
  );
}
