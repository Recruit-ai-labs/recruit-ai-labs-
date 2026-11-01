import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { readAccount } from "@/lib/account";
import { databaseConfigured } from "@/lib/db";
import { readActivity, readFeed, viewerOf } from "@/lib/feed";
import type { FeedActivity, FeedPage } from "@/lib/feed-types";
import { readMedia } from "@/lib/media";
import { emptyMedia, mediaUrl } from "@/lib/media-types";
import { readNetworkCounts, readNetworkSuggestions } from "@/lib/network";
import { readProfileViews } from "@/lib/profile-views";
import type { ProfileViewSummary } from "@/lib/social-types";
import { completion } from "@/lib/seeker-profile";

import SeekerHome from "../../../_account/seeker/SeekerHome";

export const metadata: Metadata = { title: "Home" };

// The layout has already checked the session and the role, so this only
// assembles what the home needs to print: the profile rail, the first page
// of the feed, the activity numbers, the people worth following and who has
// been reading the profile.
//
// All five reads leave at once — none of them needs another's answer — and
// each one is allowed to fail on its own. A database that is unreachable
// costs the page its list, not the whole workspace: the composer still
// works and says so.
//
// The route lives in a `(feed)` group so this page can carry its own
// loading skeleton, drawn at the shape of the home rather than the profile.
export default async function SeekerPage() {
  const account = await readAccount();
  if (!account) redirect("/sign-in");

  const { profile } = account;
  const viewer = viewerOf(account);
  const online = databaseConfigured();

  const [media, page, counts, people, network, viewers] = await Promise.all([
    readMedia(account.userId).catch(() => emptyMedia()),
    online
      ? readFeed(viewer, { filter: "for-you", limit: 12 }).catch(() => null)
      : null,
    online ? readActivity(viewer.id).catch(() => null) : null,
    online
      ? readNetworkSuggestions(viewer.id, 3).catch(() => [])
      : [],
    online ? readNetworkCounts(viewer.id).catch(() => null) : null,
    // Null rather than an empty summary: the rail has to be able to tell "no
    // one has looked" from "we could not ask".
    online
      ? readProfileViews(account.userId, 3).catch(() => null)
      : (null as ProfileViewSummary | null),
  ]);

  const feed: FeedPage = page ?? { posts: [], cursor: null };
  const activity: FeedActivity = counts ?? {
    posts: 0,
    reactions: 0,
    comments: 0,
    followers: 0,
  };

  return (
    <SeekerHome
      viewer={{
        id: account.userId,
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: account.email,
        username: profile.username,
        headline: profile.headline,
        location: [profile.city, profile.country].filter(Boolean).join(", "),
        percent: completion(profile).percent,
        photo: mediaUrl(account.userId, media.photo),
        cover: mediaUrl(account.userId, media.cover),
      }}
      feed={feed}
      activity={activity}
      suggestions={people}
      invitations={network?.incoming ?? 0}
      viewers={viewers}
      feedOffline={!online || !page}
    />
  );
}
