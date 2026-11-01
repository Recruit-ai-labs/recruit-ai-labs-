import styles from "./seeker.module.scss";

// ------------------------------------------------------------------
//  The home's loading state.
//
//  A sibling of SeekerSkeleton, drawn at the shape of the feed rather
//  than the profile: the composer card, two post cards and the two rails
//  the home prints. Next renders this inside the layout while the page
//  below is prepared, so the bar and the footer never move — only the
//  column that is actually loading.
//
//  It is the same paper the real page uses, at the same widths, so the
//  content lands in place instead of pushing everything down.
// ------------------------------------------------------------------

export default function FeedSkeleton() {
  return (
    <div className={styles.layout} aria-busy="true">
      <span className={styles.srOnly}>Loading your feed…</span>

      <aside className={styles.railLeft}>
        <div className={styles.skeletonBlock}>
          <span className={styles.skeletonLine} style={{ width: "62%" }} />
          <span className={styles.skeletonLine} style={{ width: "86%" }} />
          <span className={styles.skeletonBar} />
          <span className={styles.skeletonLineShort} />
        </div>
      </aside>

      <div className={styles.mainColumn}>
        <div className={styles.skeleton}>
          <span className={styles.skeletonLine} style={{ width: "38%" }} />
          <span className={styles.skeletonLineShort} />
        </div>

        {[0, 1, 2].map((card) => (
          <div className={styles.skeletonBlock} key={card}>
            <span className={styles.skeletonLine} style={{ width: "28%" }} />
            <span className={styles.skeletonLine} style={{ width: "92%" }} />
            <span className={styles.skeletonLine} style={{ width: "84%" }} />
            <span className={styles.skeletonBar} />
          </div>
        ))}
      </div>

      <aside className={styles.railRight}>
        <div className={styles.skeletonBlock}>
          <span className={styles.skeletonLine} style={{ width: "52%" }} />
          <span className={styles.skeletonLine} style={{ width: "78%" }} />
          <span className={styles.skeletonLineShort} />
        </div>
      </aside>
    </div>
  );
}
