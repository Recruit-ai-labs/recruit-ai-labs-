import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { readAccount } from "@/lib/account";
import { databaseConfigured } from "@/lib/db";
import { readProfilePosts, viewerOf } from "@/lib/feed";
import type { FeedPost } from "@/lib/feed-types";
import { readPublicProfile } from "@/lib/network";
import { recordProfileView } from "@/lib/profile-views";

import PublicProfileView from "../../../../_account/seeker/PublicProfileView";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const account = await readAccount();
  if (!account || !databaseConfigured()) return { title: "Profile" };

  const profile = await readPublicProfile(account.userId, id).catch(() => null);

  return { title: profile?.person.name || "Profile" };
}

// Someone else's profile, as the reader is allowed to see it.
//
// The server decides what is on this page: while the reader neither
// follows nor is connected, `readPublicProfile` returns the hero and the
// counters with every detail field emptied, so the lock cannot be undone
// by opening the inspector. Their recent posts follow the same audience
// rules as the feed.
//
// Visiting is what puts a name on the owner's "who viewed your profile"
// list, so the booking happens here and only here — `generateMetadata`
// reads the same profile through the same function, and recording inside
// it would count every visit twice. A lock costs the owner nothing: the
// reader still came, still looked at the cover and the headline, and a
// private page they could not open is still a page that was viewed.
export default async function PublicProfilePage({ params }: Params) {
  const account = await readAccount();
  if (!account) redirect("/sign-in");

  const { id } = await params;

  if (!databaseConfigured()) notFound();

  const profile = await readPublicProfile(account.userId, id).catch(() => null);
  if (!profile) notFound();

  await recordProfileView(account.userId, profile.person.id);

  const viewer = viewerOf(account);
  const posts: FeedPost[] = profile.locked
    ? []
    : await readProfilePosts(viewer, profile.person.id, 3).catch(() => []);

  return (
    <PublicProfileView
      profile={profile}
      posts={posts}
      viewer={{
        id: viewer.id,
        firstName: account.profile.firstName,
        lastName: account.profile.lastName,
        email: account.email,
        username: viewer.username,
        headline: viewer.headline,
      }}
    />
  );
}
