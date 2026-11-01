import Link from "next/link";

import styles from "./auth.module.scss";

/**
 * What renders in place of the Clerk widget when the configured keys cannot
 * answer on this host: the live instance served from localhost, or no key at
 * all. A misconfiguration should read as an instruction, not as a blank panel.
 */
export default function KeyMismatch({
  reason,
  host,
}: {
  reason: "live-key" | "missing-key";
  host: string;
}) {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="Recruit AI — home">
          <span className={styles.brandRoman}>Recruit</span>
          <span className={styles.brandAI}>AI</span>
          <sup className={styles.brandTm}>TM</sup>
        </Link>
        <Link href="/" className={styles.back}>
          Back to website
          <span aria-hidden="true">→</span>
        </Link>
      </header>

      <div className={styles.noticeWrap}>
        <span className={styles.label}>
          {reason === "missing-key"
            ? "No Clerk key configured"
            : `Live keys cannot run on ${host}`}
        </span>
        <h1 className={styles.title}>These keys belong to production.</h1>
        <p className={styles.subtitle}>
          Clerk&rsquo;s live instance answers on recruitailabs.in only, so this
          build can never start a session here. Local work needs the development
          instance&rsquo;s keys.
        </p>

        <div className={styles.notice}>
          <span className={styles.noticeLabel}>One-time fix</span>
          <ol>
            <li>
              In the Clerk dashboard switch to the <strong>Development</strong>{" "}
              instance, then open <strong>API keys</strong>.
            </li>
            <li>
              Create <code>.env.development.local</code> beside{" "}
              <code>.env.local</code> — Next reads it first in{" "}
              <code>next dev</code>.
            </li>
            <li>
              Paste both test keys and restart the dev server.
            </li>
          </ol>
          <pre>{`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...\nCLERK_SECRET_KEY=sk_test_...`}</pre>
        </div>

        <p className={styles.switchText}>
          Nothing else is affected —{" "}
          <Link href="/">back to the website</Link>.
        </p>
      </div>
    </main>
  );
}
