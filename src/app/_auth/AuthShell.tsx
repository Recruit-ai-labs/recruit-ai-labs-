import Image from "next/image";
import Link from "next/link";

import PendingLink, { ButtonSpinner } from "../_site/PendingLink";
import AccessPanel from "./AccessPanel";
import styles from "./auth.module.scss";

type AuthType = "sign-in" | "sign-up";

// The photograph each page opens with — the same pairing the workspace uses:
// the desert for returning, the alpine lake for a new beginning.
const SCENERY: Record<AuthType, { src: string; alt: string; title: string }> = {
  "sign-in": {
    src: "/auth-desert.jpg",
    alt: "Golden desert dunes surrounding a palm-lined oasis",
    title: "Find your focus.\nMake room for people.",
  },
  "sign-up": {
    src: "/auth-lake.jpg",
    alt: "An alpine lake framed by mountains and a quiet forest village",
    title: "A fresh perspective.\nA better beginning.",
  },
};

/**
 * The frame both auth pages share: wordmark and a way back on top, the form
 * on one side, a full-bleed photograph on the other. On phones the photograph
 * leads and the form follows, so the page opens on something rather than a
 * stack of fields.
 */
export default function AuthShell({ type = "sign-in" }: { type?: AuthType }) {
  const scenery = SCENERY[type];
  const creating = type === "sign-up";

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        {/* The wordmark rides the global rule at the top of the viewport: a
            ring inside a baseline-aligned lockup would push the TM sup and
            read as a defect, and it already leaves the page visibly. */}
        <Link href="/" className={styles.brand} aria-label="Recruit AI — home">
          <span className={styles.brandRoman}>Recruit</span>
          <span className={styles.brandAI}>AI</span>
          <sup className={styles.brandTm}>TM</sup>
        </Link>
        {/* This one is a button in link's clothing — the arrow becomes a ring,
            in the slot the arrow already occupied, so nothing shifts. */}
        <PendingLink
          href="/"
          className={styles.back}
          pending={<ButtonSpinner />}
          swapGlyph
        >
          Back to website
          <span aria-hidden="true">→</span>
        </PendingLink>
      </header>

      <div className={styles.layout}>
        <section className={styles.formPanel} aria-labelledby="auth-title">
          <span className={styles.label}>Your next chapter starts here</span>
          <h1 id="auth-title" className={styles.title}>
            {creating ? "Find your next\nbeginning." : "Welcome back."}
          </h1>
          <p className={styles.subtitle}>
            Sign in, then choose Job seeker or Employer. Job seeker accounts are
            free; employer workspaces require approval.
          </p>

          <AccessPanel type={type} />

          <p className={styles.switchText}>
            {creating ? (
              <>
                Already have an account? <Link href="/sign-in">Sign in</Link>
              </>
            ) : (
              <>
                New around here?{" "}
                <Link href="/sign-up">Create an account</Link>
              </>
            )}
          </p>

          {/* The three documents every visitor is entitled to read before they
              hand over an email address — plus the consent desk behind them. */}
          <div className={styles.legal}>
            <Link href="/privacy">Privacy policy</Link>
            <Link href="/cookies#preferences">Cookie preferences</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/data-rights">Data rights</Link>
          </div>
        </section>

        <aside className={styles.aside} aria-label="Recruit AI">
          {/* The one photograph on this page, and the largest thing it paints.
              Served through next/image rather than as a raw <img>: the same
              frame arrives as AVIF/WebP at the width the viewport actually
              has, instead of a 140KB JPEG on every screen. `priority` because
              it is above the fold, and `fill` because the layout is a box the
              picture sits in — not a picture the layout grows around. The
              sizing, cover and rounding already live in `.scenery`, which is
              where every other rule for this frame is written. */}
          <Image
            className={styles.scenery}
            src={scenery.src}
            alt={scenery.alt}
            fill
            priority
            sizes="(max-width: 960px) 100vw, 46vw"
            decoding="async"
            fetchPriority="high"
          />
          <div className={styles.scrim} aria-hidden="true" />

          <div className={styles.asideTop}>
            <span>Recruit AI / A little room to think</span>
            <span aria-hidden="true">↗</span>
          </div>

          <div className={styles.asideCopy}>
            <h2 className={styles.asideTitle}>{scenery.title}</h2>
            <p className={styles.asideText}>
              Connect the details. Understand the person.
              <br />
              Make the decision that feels informed.
            </p>
            <div className={styles.asideFoot}>
              Private workspaces. Human-led decisions.
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
