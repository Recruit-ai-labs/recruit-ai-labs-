import { headers } from "next/headers";
import { ClerkProvider } from "@clerk/nextjs";

import KeyMismatch from "./KeyMismatch";

// Clerk is mounted on the route groups that need it — (auth) for the sign-in
// and sign-up screens, (account) for the choose-account, onboarding and seeker
// pages — and never in the root layout, so clerk-js is never shipped to the
// marketing pages.
//
// The keys in `.env.local` are the LIVE instance, which is pinned to
// recruitailabs.in. Served from localhost it rejects every request — "The
// Request HTTP Origin header must be equal to or a subdomain of the requesting
// URL" — and the widget mounts without ever painting. That is why the panel
// looked empty rather than broken. Instead of that blank hole, the mismatch
// renders an explanation plus the one-line fix (development instance keys in
// `.env.development.local`, which Next gives priority in `next dev`).
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

export default async function ClerkGate({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  const host = (await headers()).get("host") ?? "";

  const liveKeyOnLocalhost =
    publishableKey.startsWith("pk_live_") && LOCAL_HOST.test(host);

  if (!publishableKey || liveKeyOnLocalhost) {
    return (
      <KeyMismatch
        reason={publishableKey ? "live-key" : "missing-key"}
        host={host}
      />
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>{children}</ClerkProvider>
  );
}
