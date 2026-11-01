// Clerk needs to see every request before the server reads a session.
// Without this file, `currentUser()` in a server component throws
// "auth() was called but Clerk can't detect usage of clerkMiddleware()" —
// which is exactly what happened before: the auth screens worked because
// they only use the browser SDK, but no page could ask who was signed in.
//
// This middleware protects nothing else. Every other address is still
// decided by the page that owns it (see (account)/*/page.tsx), so a
// missing session becomes a redirect to /sign-in rather than a 404 or a
// broken render.
//
// With no keys present there is nothing to attach, so the request passes
// through untouched and the auth layout shows its own configuration
// notice instead of a stack trace.
//
// ------------------------------------------------------------------
//  The one rule that lives here: where a signed-in visitor belongs
//
//  `/` is the landing page, and it is written for people who have not
//  signed in yet — it is a client component with no Clerk, so it cannot
//  ask who is reading it. Somebody opening the root with a live session
//  is asking for their own workspace, and used to get the sales page
//  again on every visit. The redirect happens here, before the landing
//  page is even chosen, so there is no flash of it first.
//
//  Only `/` is rewritten. The seeker layout finishes the routing: an
//  account with no role, or one that never finished onboarding, is sent
//  from /seeker to /choose-account or /onboarding. This rule therefore
//  never needs to know anything about roles.
//
//  `/?stay=1` opens the landing page as a visitor would see it — the way
//  back to the marketing copy for somebody who is signed in.
// ------------------------------------------------------------------

import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  if (
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    !process.env.CLERK_SECRET_KEY
  ) {
    return NextResponse.next();
  }

  return clerkMiddleware(async (auth, incoming) => {
    const url = incoming.nextUrl;

    if (url.pathname === "/" && !url.searchParams.has("stay")) {
      // Reading the session id is local work; no Clerk API call, so the
      // landing page costs a signed-out visitor nothing.
      const { userId } = await auth();
      if (userId) return NextResponse.redirect(new URL("/seeker", incoming.url));
    }
  })(request, event);
}

// Everything except Next's own assets, the favicon and anything with a
// file extension. API routes are included: the account routes read the
// same session.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)"],
};
