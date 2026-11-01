import FeedSkeleton from "../../../_account/seeker/FeedSkeleton";

// Shown while the home is being prepared. It is the home's own shape —
// the profile and settings routes keep the hero skeleton their pages are
// built from, so a navigation never flashes the wrong page's outline.
export default function SeekerFeedLoading() {
  return <FeedSkeleton />;
}
