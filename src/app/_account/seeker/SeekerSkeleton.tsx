import styles from "./seeker.module.scss";

// ------------------------------------------------------------------
//  The workspace's loading state.
//
//  Next renders this inside the layout while the page below is being
//  prepared, so the bar, the account menu and the footer are already
//  there — only the middle is missing. It is drawn at the size the real
//  page will take (cover, portrait, name, cards), so the content lands in
//  place instead of pushing the page down when it arrives.
//
//  It breathes rather than spins. A skeleton that pulses reads as "on its
//  way"; a turning ring reads as "something may be wrong", and it is the
//  one shape this workspace no longer uses (see globals.scss, pulse-soft).
// ------------------------------------------------------------------

export default function SeekerSkeleton() {
  return (
    <div className={styles.layoutProfile} aria-busy="true">
      <span className={styles.srOnly}>Loading this page…</span>

      <div className={styles.mainColumn}>
        <div className={styles.skeletonHero}>
          <span className={styles.skeletonHeroCover} />

          <div className={styles.skeletonHeroBody}>
            <span className={styles.skeletonAvatar} />

            <div className={styles.skeletonStack}>
              <span className={styles.skeletonLine} style={{ width: "31%" }} />
              <span className={styles.skeletonLine} style={{ width: "54%" }} />
              <span className={styles.skeletonLine} style={{ width: "24%" }} />
            </div>
          </div>
        </div>

        {[0, 1, 2].map((card) => (
          <div className={styles.skeletonBlock} key={card}>
            <span className={styles.skeletonLine} style={{ width: "22%" }} />
            <span className={styles.skeletonLine} style={{ width: "94%" }} />
            <span className={styles.skeletonLine} style={{ width: "88%" }} />
            <span className={styles.skeletonLine} style={{ width: "46%" }} />
          </div>
        ))}
      </div>

      <aside className={styles.railRight}>
        <div className={styles.skeletonBlock}>
          <span className={styles.skeletonLine} style={{ width: "48%" }} />
          <span className={styles.skeletonBar} />
          <span className={styles.skeletonLine} style={{ width: "82%" }} />
          <span className={styles.skeletonLine} style={{ width: "70%" }} />
        </div>
      </aside>
    </div>
  );
}
