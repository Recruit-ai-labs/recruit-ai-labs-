import SeekerSkeleton from "../../_account/seeker/SeekerSkeleton";

// Shown while a /seeker route is being prepared. The layout above it — the
// bar, the account menu, the footer — stays exactly where it is, which is
// the point: the workspace is not reloading, only the page inside it.
export default function SeekerLoading() {
  return <SeekerSkeleton />;
}
