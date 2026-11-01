import Link from "next/link";

import CookiePrefsButton from "./CookiePrefsButton";
import styles from "./chrome.module.scss";

/**
 * The frame every reading page shares — About, Careers and the DPDP set.
 *
 * Deliberately plain: a sticky strip with the wordmark and three ways to
 * leave, then the ink footer. The landing page owns the theatre; these
 * pages only need to be legible, quick and honest.
 */

export const CONTACT_EMAIL = "hello@recruitailabs.in";

export const COMPANY = {
  name: "Recruit AI Labs",
  product: "Recruit AI",
  email: CONTACT_EMAIL,
  base: "Raipur, Chhattisgarh · India",
  hours: "Mon–Fri · 09:00–18:00 IST",
  founded: "2026",
};

const HEADER_LINKS = [
  { label: "About", href: "/about", key: "about" },
  { label: "Careers", href: "/careers", key: "careers" },
  { label: "Product", href: "/#platform", key: "product" },
];

const FOOTER_COLUMNS = [
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Contact", href: `mailto:${CONTACT_EMAIL}` },
    ],
  },
  {
    title: "Product",
    links: [
      { label: "Workspace", href: "/#platform" },
      { label: "Shortlist", href: "/#teams" },
      { label: "Flow", href: "/#flow" },
      { label: "Roles", href: "/#talent" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy notice", href: "/privacy" },
      { label: "Cookie notice", href: "/cookies" },
      { label: "Terms", href: "/terms" },
      { label: "Data rights", href: "/data-rights" },
    ],
  },
];

export function Arrow({ size = 11 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M1 6h9.2M6.8 2.2 10.6 6l-3.8 3.8"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PageHeader({ active }: { active?: string }) {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand} aria-label="Recruit AI — home">
        <span className={styles.brandRoman}>Recruit</span>
        <span className={styles.brandAI}>AI</span>
        <sup className={styles.brandTm}>TM</sup>
      </Link>

      <nav className={styles.nav} aria-label="Primary">
        {HEADER_LINKS.map((link) => (
          <Link
            key={link.key}
            href={link.href}
            className={styles.navLink}
            aria-current={active === link.key ? "page" : undefined}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <Link href="/sign-in" className={styles.headerCta}>
        Sign in
        <span aria-hidden="true">→</span>
      </Link>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerTop}>
        <div>
          <p className={styles.footerBrandLine}>
            Recruit <i>AI</i>
            <sup className={styles.brandTm}>TM</sup>
          </p>
          <p className={styles.footerTagline}>
            Recruitment intelligence built around one idea: the decision stays
            human, the evidence stays together.
          </p>
          <p className={styles.footerTagline}>
            {CONTACT_EMAIL}
            <br />
            {COMPANY.base}
          </p>
        </div>

        <nav className={styles.footerCols} aria-label="Footer">
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <p className={styles.footerColTitle}>{column.title}</p>
              <ul className={styles.footerList}>
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className={styles.footerLink}>
                      {link.label}
                    </Link>
                  </li>
                ))}
                {column.title === "Legal" && (
                  <li>
                    <CookiePrefsButton />
                  </li>
                )}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className={styles.footerWordmarkWrap}>
        <span aria-hidden="true" className="footer-wordmark block select-none">
          Recruit AI
        </span>
      </div>

      <div className={styles.footerBottom}>
        <span className={styles.footerBottomText}>
          © 2026 {COMPANY.name} — All rights reserved
        </span>
        <div className={styles.footerBottomLinks}>
          <Link href="/privacy" className={styles.footerLink}>
            Privacy
          </Link>
          <Link href="/cookies" className={styles.footerLink}>
            Cookies
          </Link>
          <Link href="/terms" className={styles.footerLink}>
            Terms
          </Link>
          <Link href="/data-rights" className={styles.footerLink}>
            Data rights
          </Link>
        </div>
      </div>
    </footer>
  );
}

/**
 * Wraps a page: skip link, header, the page's own content, footer.
 * `active` lights the matching nav item.
 */
export default function SitePages({
  active,
  children,
}: {
  active?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.page}>
      <a href="#main" className={styles.skip}>
        Skip to content
      </a>
      <PageHeader active={active} />
      <main id="main">{children}</main>
      <SiteFooter />
    </div>
  );
}
