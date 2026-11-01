// ------------------------------------------------------------------
//  Account — the one place that reads and writes role + profile on a
//  Clerk user.
//
//  Why Clerk metadata and not a table yet: onboarding data is a few
//  kilobytes of text, and this repo has no database layer. Keeping every
//  read and write behind these two functions means moving to a real
//  table later is a change in this file, not in the pages.
//
//  Metadata lives in `publicMetadata` (server-written, read-only from the
//  browser) rather than `unsafeMetadata`, which the client can rewrite —
//  an employer workspace opening later must not be a decision the
//  browser gets to make.
// ------------------------------------------------------------------

import "server-only";

import { cache } from "react";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";

import { rememberPerson } from "./people";
import {
  emptyProfile,
  parseProfile,
  type SeekerProfile,
} from "./seeker-profile";

export type AccountRole = "seeker" | "employer";

export type Account = {
  userId: string;
  email: string;
  role: AccountRole | null;
  profile: SeekerProfile;
};

/** An expected failure: a message and status the route can send as-is. */
export class AccountError extends Error {
  readonly status: number;
  readonly step?: number;

  constructor(message: string, status = 400, step?: number) {
    super(message);
    this.status = status;
    this.step = step;
  }
}

type AccountMetadata = {
  role?: unknown;
  seeker?: unknown;
};

type ClerkUser = NonNullable<Awaited<ReturnType<typeof currentUser>>>;

function primaryEmail(user: ClerkUser) {
  const primary = user.emailAddresses.find(
    (address) => address.id === user.primaryEmailAddressId,
  );

  return primary?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? "";
}

function roleFrom(metadata: AccountMetadata): AccountRole | null {
  return metadata.role === "seeker" || metadata.role === "employer"
    ? metadata.role
    : null;
}

// A stored profile is re-parsed on read so a half-written or older shape
// can never reach a page as if it were complete.
function profileFrom(metadata: AccountMetadata): SeekerProfile {
  if (!metadata.seeker || typeof metadata.seeker !== "object") {
    return emptyProfile();
  }

  const parsed = parseProfile(metadata.seeker);
  if (!parsed.ok) return emptyProfile();

  const stored = metadata.seeker as Record<string, unknown>;

  return {
    ...parsed.profile,
    completedAt:
      typeof stored.completedAt === "string" ? stored.completedAt : "",
  };
}

async function signedInUser() {
  const user = await currentUser();
  if (!user) throw new AccountError("Sign in to continue.", 401);
  return user;
}

// ------------------------------------------------------------------
//  The account memo
//
//  `currentUser()` is a round trip to Clerk's API — on a remote instance
//  that is the slowest thing a signed-in render does, and it used to
//  happen on every click: the seeker layout asks for the account to gate
//  the page, and the page asks again to print it. React's `cache` makes
//  that one call per request; this map makes it one call per change.
//
//  Every write in this file drops the entry before it returns, so a
//  saved headline is never older than the write itself. The ceiling is
//  for the case a change happens somewhere this file cannot see (the
//  Clerk dashboard) and for the map never outgrowing a busy process.
// ------------------------------------------------------------------
const MEMO_MS = 60_000;
const MEMO_MAX = 500;

const memo = new Map<string, { at: number; account: Account }>();

function memoised(userId: string) {
  const hit = memo.get(userId);
  if (!hit) return null;

  if (Date.now() - hit.at > MEMO_MS) {
    memo.delete(userId);
    return null;
  }

  return hit.account;
}

/** Drop the memo after anything writes this person's metadata. */
export function forgetAccount(userId: string) {
  memo.delete(userId);
}

/**
 * The signed-in account, or null when there is no session.
 *
 * Wrapped in `cache` because a single request reads it more than once: the
 * seeker layout gates on it, and the page inside that layout needs the same
 * profile to render. React keeps one call per request, so Clerk is asked
 * once instead of once per component.
 */
export const readAccount = cache(async (): Promise<Account | null> => {
  // Reading the session id off the token is local; only the user record
  // itself is a request, and that is the one the memo exists to skip.
  const { userId } = await auth();
  if (!userId) return null;

  const known = memoised(userId);
  if (known) return known;

  const user = await currentUser();
  if (!user || user.id !== userId) return null;

  const metadata = (user.publicMetadata ?? {}) as AccountMetadata;

  const account: Account = {
    userId: user.id,
    email: primaryEmail(user),
    role: roleFrom(metadata),
    profile: profileFrom(metadata),
  };

  if (memo.size >= MEMO_MAX) memo.clear();
  memo.set(account.userId, { at: Date.now(), account });

  return account;
});

/**
 * Record the role chosen on /choose-account. Only the job seeker side is
 * open today, so an employer choice is refused rather than stored.
 */
export async function chooseRole(role: unknown) {
  if (role !== "seeker" && role !== "employer") {
    throw new AccountError("Choose Job seeker or Employer.");
  }
  if (role === "employer") {
    throw new AccountError("Employer workspaces are not open yet.", 403);
  }

  const user = await signedInUser();
  const metadata = (user.publicMetadata ?? {}) as AccountMetadata;

  // The whole key is resent: replace keeps the stored shape exactly what
  // this function wrote, with no merge leftovers from an earlier save.
  await (
    await clerkClient()
  ).users.replaceUserMetadata(user.id, {
    publicMetadata: { ...metadata, role },
  });

  forgetAccount(user.id);

  return {
    role,
    redirect: isOnboarded(profileFrom(metadata)) ? "/seeker" : "/onboarding",
  };
}

/** Save an onboarding submission and stamp it complete. */
export async function saveSeekerProfile(input: unknown) {
  const user = await signedInUser();
  const metadata = (user.publicMetadata ?? {}) as AccountMetadata;

  if (roleFrom(metadata) !== "seeker") {
    throw new AccountError("Choose Job seeker to continue.", 403);
  }

  const parsed = parseProfile(input);
  if (!parsed.ok) throw new AccountError(parsed.error, 400, parsed.step);

  const profile: SeekerProfile = {
    ...parsed.profile,
    completedAt: new Date().toISOString(),
  };

  await (
    await clerkClient()
  ).users.replaceUserMetadata(user.id, {
    publicMetadata: { ...metadata, role: "seeker", seeker: profile },
  });

  forgetAccount(user.id);

  // The workspace prints a name beside every post, and asking Clerk once per
  // author is not a plan. Mirror the short version now. A mirror failure must
  // not fail an onboarding that has already been written, so it is reported
  // and swallowed rather than thrown.
  await rememberPerson(user.id, profile).catch((error) => {
    console.error("Could not mirror the seeker profile", error);
  });

  return { redirect: "/seeker", profile };
}

/**
 * Save an edit made on the profile page.
 *
 * The same validator guards it, so a section that is edited in isolation
 * still has to leave a whole profile that would have passed onboarding.
 * The completion stamp is carried over rather than rewritten: editing a
 * headline is not a second onboarding, and losing the stamp would send
 * the account back through the wizard.
 */
export async function updateSeekerProfile(input: unknown) {
  const user = await signedInUser();
  const metadata = (user.publicMetadata ?? {}) as AccountMetadata;

  if (roleFrom(metadata) !== "seeker") {
    throw new AccountError("Choose Job seeker to continue.", 403);
  }

  const parsed = parseProfile(input);
  if (!parsed.ok) throw new AccountError(parsed.error, 400, parsed.step);

  const profile: SeekerProfile = {
    ...parsed.profile,
    completedAt: profileFrom(metadata).completedAt,
  };

  await (
    await clerkClient()
  ).users.replaceUserMetadata(user.id, {
    publicMetadata: { ...metadata, role: "seeker", seeker: profile },
  });

  forgetAccount(user.id);

  // The feed prints a name and a headline beside every post, and those are
  // read from the mirror. An edit that skipped this would leave the author
  // of yesterday's post introducing themselves with yesterday's headline.
  await rememberPerson(user.id, profile).catch((error) => {
    console.error("Could not mirror the seeker profile", error);
  });

  return { profile };
}

/** Reject cross-site posts, matching the rest of the signed-in surface. */
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    throw new AccountError("Submit from this website.", 403);
  }
}

/**
 * Same-origin check plus a JSON body, for the two account routes. The cap is
 * generous for a profile and still small enough that a bad client cannot
 * make the handler read megabytes.
 */
export async function readAccountBody(request: Request, limit = 64_000) {
  sameOrigin(request);

  if (Number(request.headers.get("content-length")) > limit) {
    throw new AccountError("Request too large.", 413);
  }

  const raw = await request.text();
  if (raw.length > limit) throw new AccountError("Request too large.", 413);

  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error();
    return data as Record<string, unknown>;
  } catch {
    throw new AccountError("Invalid request.");
  }
}

/** Turn a thrown error into the JSON shape both routes return. */
export function accountFailure(error: unknown) {
  if (error instanceof AccountError) {
    return Response.json(
      {
        error: error.message,
        ...(error.step === undefined ? {} : { step: error.step }),
      },
      {
        status: error.status,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  console.error("Account request failed", error);

  return Response.json(
    { error: "Could not save that. Please try again." },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}

function isOnboarded(profile: SeekerProfile) {
  return Boolean(profile.completedAt);
}
