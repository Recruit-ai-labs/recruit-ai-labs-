import Link from "next/link";

import SitePages, { Arrow, CONTACT_EMAIL } from "./SiteChrome";
import styles from "./chrome.module.scss";

/**
 * The document layout the DPDP pages share: hero, sticky index, numbered
 * sections. Content is described as data (see the `P` / `UL` / `TABLE`
 * helpers) so a policy reads like a policy in the page file instead of
 * being buried in a wall of JSX.
 */

export type LegalBlock =
  | { kind: "p"; text: string }
  | { kind: "sub"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "table"; head: string[]; rows: string[][] }
  | { kind: "note"; text: string }
  | { kind: "link"; label: string; href: string };

export type LegalSection = {
  no: string;
  id: string;
  title: string;
  blocks: LegalBlock[];
};

export const P = (text: string): LegalBlock => ({ kind: "p", text });
export const SUB = (text: string): LegalBlock => ({ kind: "sub", text });
export const UL = (items: string[]): LegalBlock => ({ kind: "ul", items });
export const OL = (items: string[]): LegalBlock => ({ kind: "ol", items });
export const TABLE = (head: string[], rows: string[][]): LegalBlock => ({
  kind: "table",
  head,
  rows,
});
export const NOTE = (text: string): LegalBlock => ({ kind: "note", text });
export const LINK = (label: string, href: string): LegalBlock => ({
  kind: "link",
  label,
  href,
});

/** Turns **emphasis** inside a string into <strong>. Nothing else. */
function rich(text: string, keyPrefix: string) {
  return text.split(/\*\*(.+?)\*\*/g).map((part, index) =>
    index % 2 === 1 ? <strong key={`${keyPrefix}-${index}`}>{part}</strong> : part,
  );
}

function Block({ block, index }: { block: LegalBlock; index: number }) {
  const key = `b-${index}`;

  switch (block.kind) {
    case "sub":
      return <h3 className={styles.sectionHeading}>{block.text}</h3>;

    case "p":
      return <p className={styles.sectionText}>{rich(block.text, key)}</p>;

    case "note":
      return (
        <p className={styles.note}>
          <strong>Note </strong>
          {rich(block.text, key)}
        </p>
      );

    case "ul":
    case "ol": {
      const ordered = block.kind === "ol";
      return (
        <ul
          className={`${styles.docList} ${ordered ? styles.docListOrdered : ""}`}
        >
          {block.items.map((item, itemIndex) => (
            <li key={itemIndex}>{rich(item, `${key}-${itemIndex}`)}</li>
          ))}
        </ul>
      );
    }

    case "table":
      return (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                {block.head.map((cell) => (
                  <th key={cell} scope="col">
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "link":
      return (
        <Link href={block.href} className={styles.docFootLink}>
          {block.label}
        </Link>
      );

    default:
      return null;
  }
}

export default function LegalPage({
  active,
  kicker,
  title,
  accent,
  lead,
  updated,
  version,
  applies,
  glance,
  sections,
  heroActions,
  children,
}: {
  active?: string;
  kicker: string;
  title: string;
  accent?: string;
  lead: string;
  updated: string;
  version: string;
  applies: string;
  glance?: { label: string; value: string }[];
  sections: LegalSection[];
  heroActions?: { label: string; href: string; solid?: boolean }[];
  children?: React.ReactNode;
}) {
  return (
    <SitePages active={active}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.kicker}>{kicker}</p>
          <h1 className={styles.title}>
            {title}
            {accent && (
              <>
                {" "}
                <span className={styles.titleEm}>{accent}</span>
              </>
            )}
          </h1>
          <p className={styles.lead}>{lead}</p>

          {heroActions && heroActions.length > 0 && (
            <div className={styles.heroActions}>
              {heroActions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className={`${styles.heroAction} ${
                    action.solid ? styles.heroActionSolid : ""
                  }`}
                >
                  {action.label}
                  <Arrow size={11} />
                </Link>
              ))}
            </div>
          )}

          <div className={styles.metaRow}>
            <div className={styles.metaItem}>
              <span className={styles.metaKey}>Last reviewed</span>
              <span className={styles.metaValue}>{updated}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaKey}>Version</span>
              <span className={styles.metaValue}>{version}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaKey}>Applies to</span>
              <span className={styles.metaValue}>{applies}</span>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.docBody}>
        <aside className={styles.toc} aria-label="On this page">
          <p className={styles.tocTitle}>On this page</p>
          <nav className={styles.tocList}>
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={styles.tocLink}
              >
                <span className={styles.tocNo}>{section.no}</span>
                <span>{section.title}</span>
              </a>
            ))}
          </nav>
        </aside>

        <article className={styles.article}>
          {glance && glance.length > 0 && (
            <div className={styles.glance}>
              {glance.map((fact) => (
                <div key={fact.label} className={styles.glanceCell}>
                  <p className={styles.glanceLabel}>{fact.label}</p>
                  <p className={styles.glanceValue}>{fact.value}</p>
                </div>
              ))}
            </div>
          )}

          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className={styles.section}
              aria-labelledby={`${section.id}-title`}
            >
              <span className={styles.sectionNo} aria-hidden="true">
                {section.no}
              </span>
              <div>
                <h2
                  id={`${section.id}-title`}
                  className={styles.sectionHeading}
                >
                  {section.title}
                </h2>
                <div className={styles.sectionStack}>
                  {section.blocks.map((block, index) => (
                    <Block key={index} block={block} index={index} />
                  ))}
                </div>
              </div>
            </section>
          ))}

          {children}

          <div className={styles.docFoot}>
            <p className={styles.docFootText}>
              Questions about this document? Write to{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className={styles.docFootLink}
              >
                {CONTACT_EMAIL}
              </a>
              . We answer within three working days.
            </p>
            <div className={styles.docFootLinks}>
              <Link href="/privacy" className={styles.docFootLink}>
                Privacy
              </Link>
              <Link href="/cookies" className={styles.docFootLink}>
                Cookies
              </Link>
              <Link href="/terms" className={styles.docFootLink}>
                Terms
              </Link>
              <Link href="/data-rights" className={styles.docFootLink}>
                Data rights <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>
        </article>
      </div>
    </SitePages>
  );
}

/**
 * The dark closing panel used at the end of a policy — one question, one
 * honest route to a human. Exported so the pages can phrase it their way.
 */
export function DocCallout({
  title,
  text,
  primary,
  secondary,
}: {
  title: string;
  text: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
}) {
  return (
    <aside className={styles.callout}>
      <h2 className={styles.calloutTitle}>{title}</h2>
      <p className={styles.calloutText}>{text}</p>
      <div className={styles.calloutActions}>
        <Link
          href={primary.href}
          className={`${styles.calloutLink} ${styles.calloutLinkSolid}`}
        >
          {primary.label}
          <Arrow size={11} />
        </Link>
        {secondary && (
          <Link href={secondary.href} className={styles.calloutLink}>
            {secondary.label}
          </Link>
        )}
      </div>
    </aside>
  );
}
