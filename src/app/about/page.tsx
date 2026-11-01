import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";

import SitePage, { Arrow, CONTACT_EMAIL } from "../_site/SiteChrome";
import styles from "../_site/content.module.scss";

export const metadata: Metadata = {
  title: "About — Recruit AI",
  description:
    "Recruit AI Labs builds one workspace for the whole hiring record — sourcing, interviews, verification and the decision. Founded in Raipur, Chhattisgarh, 2026.",
};

/**
 * The statement that opens the page. Every word is its own reveal step, so
 * the paragraph fills in as you scroll — the same device the landing page
 * uses for its manifesto, at a quarter of the length.
 */
const STATEMENT =
  "Hiring has always been a judgement about a person, never a keyword. Yet the evidence behind that judgement is scattered across a dozen inboxes, so the call gets made on whichever half of the story loaded first. We build one desk where the whole record sits together.";

const STATEMENT_WORDS = STATEMENT.split(" ");

const PRINCIPLES = [
  {
    no: "01",
    title: "Evidence over instinct — beside it",
    copy: "Instinct is not the enemy; memory is. Every note, answer and document stays attached to the person it belongs to, so a decision can be explained a month later without anyone relying on recollection.",
  },
  {
    no: "02",
    title: "The decision stays human",
    copy: "The software reads, sorts and summarises. It does not choose. A hiring team reviews the evidence and owns the outcome, and a candidate can always ask for a human look.",
  },
  {
    no: "03",
    title: "Privacy is the default",
    copy: "Consent is asked for before a recording starts, not after. Verification collects the smallest document that answers the question. Nothing is sold, and nothing optional is pre-ticked.",
  },
  {
    no: "04",
    title: "Calm software",
    copy: "Hiring already produces enough noise. The workspace is quiet by design — one typeface for reading, one for labels, nothing blinking, no red badge counting things you cannot act on.",
  },
];

const STUDIO_FACTS = [
  { value: "2026", label: "Founded" },
  { value: "Raipur", label: "Base · Chhattisgarh" },
  { value: "Four", label: "Stages · source, evaluate, interview, verify" },
  { value: "One", label: "Workspace, not five tools" },
];

/**
 * The partners, printed rather than drawn. Each file is that partner's own
 * artwork redrawn in one ink on transparent paper by scripts/mark-logos.mjs,
 * so nothing sits behind the mark — no card, no plate, only the page's paper
 * showing through the counters.
 */
const BACKERS = [
  { name: "Businessgarh", logo: "/supported-businessgarh-ink.png" },
  { name: "SSIPMT Raipur", logo: "/supported-SSIPMT-ink.png" },
  { name: "Raise Money", logo: "/supported-raisemoney-ink.png" },
  { name: "VSNTM Commons", logo: "/supported-vsntm-ink.png" },
];

export default function AboutPage() {
  return (
    <SitePage active="about">
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.eyebrow}>Recruit AI / About</p>
          <h1 className={styles.title}>
            The room behind <em>the hire.</em>
          </h1>

          <div className={styles.heroRow}>
            <p className={styles.heroLead}>
              Recruit AI is a workspace for teams who would rather read the
              whole story than the first half of it. We build the quiet
              machinery around a decision that should stay human.
            </p>

            <div className={styles.heroFacts}>
              <div className={styles.heroFact}>
                <p className={styles.heroFactKey}>Founded</p>
                <p className={styles.heroFactValue}>2026 · Raipur</p>
              </div>
              <div className={styles.heroFact}>
                <p className={styles.heroFactKey}>Built for</p>
                <p className={styles.heroFactValue}>Hiring teams</p>
              </div>
              <div className={styles.heroFact}>
                <p className={styles.heroFactKey}>Contact</p>
                <p className={styles.heroFactValue}>{CONTACT_EMAIL}</p>
              </div>
              <div className={styles.heroFact}>
                <p className={styles.heroFactKey}>Careers</p>
                <p className={styles.heroFactValue}>Opening soon</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- the statement ------------------------------------------- */}
      <div className={styles.band}>
        <div className={styles.statementWrap}>
          <p className={styles.statement}>
            {STATEMENT_WORDS.map((word, index) => (
              // The word's place in the paragraph. The reveal is one timeline
              // sliced into as many ranges as there are words, and `--i` is what
              // picks the slice — without it every word would share a range and
              // the paragraph would ink in as a single block.
              <span
                key={`${word}-${index}`}
                className={styles.statementWord}
                style={{ "--i": index } as CSSProperties}
              >
                {word}
              </span>
            ))}
          </p>

          <div className={styles.statementFoot}>
            <span className={styles.chapterLabel}>
              The position, in one paragraph
            </span>
            <span className={styles.chapterNote}>Est. 2026</span>
          </div>
        </div>
      </div>

      {/* ---- 01 · why ------------------------------------------------ */}
      <div className={styles.band}>
        <section className={styles.section} aria-labelledby="why-title">
          <div className={styles.chapterHead}>
            <span className={styles.chapterLabel}>
              01 — Why we exist
            </span>
            <span className={styles.chapterNote}>A fragmented record</span>
          </div>

          <div className={`${styles.twoCol} mt-[clamp(20px,3.6vh,38px)]`}>
            <h2 id="why-title" className={styles.headline}>
              A good hire is lost in <em>the handover.</em>
            </h2>
            <div>
              <p className={styles.body}>
                The résumé lives in one inbox. The interview notes live in a
                document nobody opens again. The verification sits in an email
                chain, and the reason the team liked someone survives only in
                the memory of whoever was on the call.
              </p>
              <p className={styles.body}>
                So the decision quietly becomes a decision about what is
                easiest to retrieve — not about who is best for the work.
                Recruit AI exists to close that gap: source, evaluate,
                interview and verify in one place, with every piece of evidence
                left standing next to the others.
              </p>
              <p className={styles.body}>
                We are not trying to automate the judgement. We are trying to
                make sure the judgement has something to stand on.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* ---- 02 · principles ----------------------------------------- */}
      <div className={styles.band}>
        <section className={styles.sectionTight} aria-labelledby="principles-title">
          <div className={styles.chapterHead}>
            <span className={styles.chapterLabel}>
              02 — How we work
            </span>
            <span className={styles.chapterNote}>Four rules we keep</span>
          </div>

          <h2 id="principles-title" className={`${styles.headline} mt-4`}>
            Principles we would rather <em>lose a deal over.</em>
          </h2>

          <div className={styles.principles}>
            {PRINCIPLES.map((principle) => (
              <article key={principle.no} className={styles.principle}>
                <span className={styles.principleNo}>{principle.no}</span>
                <h3 className={styles.principleTitle}>{principle.title}</h3>
                <p className={styles.principleCopy}>{principle.copy}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      {/* ---- 03 · the studio ----------------------------------------- */}
      <div className={styles.band}>
        <section className={styles.sectionTight} aria-labelledby="studio-title">
          <div className={styles.chapterHead}>
            <span className={styles.chapterLabel}>03 — The studio</span>
            <span className={styles.chapterNote}>
              Small, deliberately
            </span>
          </div>

          <div className={`${styles.twoCol} mt-[clamp(20px,3.6vh,38px)]`}>
            <h2 id="studio-title" className={styles.headline}>
              A small team, closer to <em>the work.</em>
            </h2>
            <div>
              <p className={styles.body}>
                We are a small studio in Raipur, Chhattisgarh, building for
                hiring teams across India. Everyone here talks to the people
                who use the product — there is no layer in between to translate
                a request into something smaller.
              </p>
              <p className={styles.body}>
                That is also why we ship at a deliberate pace. A workspace that
                holds someone&rsquo;s interview, documents and employment
                history does not get to move fast and break things; it gets to
                move carefully and explain itself.
              </p>
            </div>
          </div>

          <div className={styles.facts}>
            {STUDIO_FACTS.map((fact) => (
              <div key={fact.label} className={styles.fact}>
                <p className={styles.factValue}>{fact.value}</p>
                <p className={styles.factLabel}>{fact.label}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ---- 04 · founder -------------------------------------------- */}
      <div className={styles.band}>
        <section className={styles.sectionTight} aria-labelledby="founder-title">
          <div className={styles.chapterHead}>
            <span className={styles.chapterLabel}>04 — Who is behind it</span>
            <span className={styles.chapterNote}>One founder, no committee</span>
          </div>

          <h2 id="founder-title" className={`${styles.headline} mt-4`}>
            Started by someone who kept <em>redoing the handover.</em>
          </h2>

          <div className={`${styles.founder} mt-[clamp(20px,3.4vh,34px)]`}>
            <div className={styles.founderPhoto}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/founder-aadil-hussain.webp"
                alt="Aadil Hussain, founder of Recruit AI"
                decoding="async"
              />
            </div>

            <div className={styles.founderBody}>
              <p className={styles.founderQuote}>
                &ldquo;I kept watching good hires get lost in the handover — the
                résumé in one place, the interview notes in another, the
                verification in an email chain. Recruit AI is the desk where all
                of it finally sits together, so the room can look at the whole
                person at once.&rdquo;
              </p>

              <div className={styles.founderMeta}>
                <span className={styles.founderName}>Aadil Hussain</span>
                <span className={styles.founderRole}>
                  Founder · Recruit AI Labs
                </span>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className={styles.founderRole}
                >
                  {CONTACT_EMAIL}
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ---- 05 · backers -------------------------------------------- */}
      <div className={styles.band}>
        <section className={styles.sectionTight} aria-labelledby="backers-title">
          <div className={styles.chapterHead}>
            <span className={styles.chapterLabel}>05 — Supported by</span>
            <span className={styles.chapterNote}>
              Capital, campus and counsel
            </span>
          </div>

          <h2 id="backers-title" className={`${styles.headline} mt-4`}>
            Good company to <em>build in.</em>
          </h2>

          <div className={styles.backers}>
            <div className={styles.backerGrid}>
              {BACKERS.map((backer) => (
                <div key={backer.name} className={styles.backer}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={backer.logo} alt="" decoding="async" />
                  <span className={styles.backerName}>{backer.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ---- close --------------------------------------------------- */}
      <section className={styles.closing}>
        <div className={styles.closingInner}>
          <p className={styles.closingLabel}>06 — Next</p>
          <h2 className={styles.closingTitle}>
            Bring us <em>the hardest role.</em>
          </h2>
          <p className={styles.closingText}>
            The best way to understand the workspace is to walk a real role
            through it. Send us the one you have been circling for weeks.
          </p>
          <div className={styles.closingActions}>
            <Link href="/sign-up" className={styles.closingPrimary}>
              Create an account
              <Arrow size={11} />
            </Link>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className={styles.closingSecondary}
            >
              {CONTACT_EMAIL}
            </a>
            <Link href="/careers" className={styles.closingSecondary}>
              See careers
            </Link>
          </div>
        </div>
      </section>
    </SitePage>
  );
}
