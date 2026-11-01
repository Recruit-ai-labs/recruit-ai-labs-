import type { Metadata } from "next";
import Link from "next/link";

import SitePage, { Arrow, CONTACT_EMAIL } from "../_site/SiteChrome";
import styles from "../_site/content.module.scss";

export const metadata: Metadata = {
  title: "Careers — Recruit AI",
  description:
    "Recruit AI is not hiring yet. What we will open, how we work, and how to register interest before the first role is published.",
};

/** Prefilled so a speculative note arrives with something to reply to. */
const INTEREST_MAIL =
  `mailto:${CONTACT_EMAIL}` +
  "?subject=Careers%20%E2%80%94%20register%20interest" +
  "&body=Name%3A%0A" +
  "What%20you%20do%20(role%20or%20craft)%3A%0A" +
  "Where%20you%20are%20based%3A%0A" +
  "One%20thing%20you%20have%20built%20that%20you%20are%20proud%20of%3A%0A" +
  "What%20you%20would%20want%20to%20work%20on%20here%3A%0A";

const STATUS = [
  { key: "Status", value: "Preparing", live: true },
  { key: "Open roles", value: "None yet" },
  { key: "First roles", value: "Coming soon" },
  { key: "Base", value: "Raipur · remote" },
];

const ROLES = [
  {
    no: "01",
    title: "Product engineer",
    copy: "TypeScript and React on the surface, Node and Postgres underneath. You would own a piece of the workspace end to end — the schema, the interface and the empty state nobody remembered to write.",
    foot: "Not open yet",
  },
  {
    no: "02",
    title: "Product designer",
    copy: "Interface design with an opinion about typography, density and restraint. This product is read more than it is clicked, and the design has to survive a hiring manager’s twelfth tab.",
    foot: "Not open yet",
  },
  {
    no: "03",
    title: "Applied ML",
    copy: "Retrieval, extraction and summarisation over résumés and interview transcripts. The interesting part is not the model — it is the evaluation that tells you whether a summary is honest.",
    foot: "Not open yet",
  },
  {
    no: "04",
    title: "Partnerships",
    copy: "Talk to hiring teams in Raipur and across India, and write down what they actually need. Half the job is listening, the other half is turning it into something the team can build.",
    foot: "Not open yet",
  },
];

const WORKING = [
  {
    title: "Small team, real ownership",
    copy: "No layer between the person with the idea and the person who ships it. You would see your work reach a hiring team within weeks, not quarters.",
  },
  {
    title: "Written, then built",
    copy: "We decide in writing before anything is designed. A short document is faster than a month of misalignment, and it leaves a trail for whoever joins next.",
  },
  {
    title: "Calm pace, honest dates",
    copy: "We do not run on heroics. Dates are set with the people doing the work, and a slipped date is a planning problem, not a character flaw.",
  },
  {
    title: "In the studio, or near enough",
    copy: "The studio is in Raipur. We work in person when it helps and asynchronously when it does not, with a few hours of daily overlap for the rest of India.",
  },
];

const PROCESS = [
  {
    title: "A conversation, not a gauntlet",
    copy: "One call with the founder, one with the person you would work beside most. We ask about work you have done, not brain-teasers.",
  },
  {
    title: "A small sample on a real problem",
    copy: "A few hours, scoped in advance, on something close to the actual job. We tell you how it will be assessed before you start it.",
  },
  {
    title: "A decision within two weeks",
    copy: "A yes or a no, with reasons. No ghosting, no holding pattern, no unanswered email after the final round.",
  },
  {
    title: "A band, in the first message",
    copy: "The salary range is in the role listing and repeated before the first call. Negotiation should not depend on who asks first.",
  },
];

export default function CareersPage() {
  return (
    <SitePage active="careers">
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.eyebrow}>Recruit AI / Careers</p>
          <h1 className={styles.title}>
            Not hiring. <em>Not yet.</em>
          </h1>

          <div className={styles.heroRow}>
            <p className={styles.heroLead}>
              There are no open roles today. When there are, they will be listed
              on this page with a salary band and a process — not buried in a
              &ldquo;we are always looking for talent&rdquo; line.
            </p>

            <div className={styles.heroFacts}>
              <div className={styles.heroFact}>
                <p className={styles.heroFactKey}>Studio</p>
                <p className={styles.heroFactValue}>Raipur, Chhattisgarh</p>
              </div>
              <div className={styles.heroFact}>
                <p className={styles.heroFactKey}>Team</p>
                <p className={styles.heroFactValue}>Small by design</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- status band --------------------------------------------- */}
      <div className={styles.statusBand}>
        <div className={styles.statusRow}>
          {STATUS.map((cell) => (
            <div key={cell.key} className={styles.statusCell}>
              <span className={styles.statusKey}>{cell.key}</span>
              <span className={styles.statusValue}>
                {cell.live && (
                  <span className={styles.statusDot} aria-hidden="true" />
                )}
                {cell.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ---- 01 · coming soon ---------------------------------------- */}
      <div className={styles.band}>
        <section
          className={`${styles.section} ${styles.sectionRelative}`}
          aria-labelledby="soon-title"
        >
          <span className={styles.watermark} aria-hidden="true">
            Soon
          </span>

          <div className={styles.chapterHead}>
            <span className={styles.chapterLabel}>01 — Coming soon</span>
            <span className={styles.chapterNote}>On purpose</span>
          </div>

          <div className={`${styles.twoCol} mt-[clamp(20px,3.6vh,38px)]`}>
            <h2 id="soon-title" className={styles.headline}>
              We will open roles <em>when the work is ready.</em>
            </h2>
            <div>
              <p className={styles.body}>
                A workspace that holds someone&rsquo;s interview, documents and
                employment history takes careful building. Adding people before
                the work is ready makes the product worse and the job worse —
                so we are holding the door shut a little longer than is
                comfortable.
              </p>
              <p className={styles.body}>
                What that means for you: nothing to apply to today. What it does
                not mean: a waiting list that goes nowhere. If you write to us,
                a person reads it and replies.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* ---- 02 · what we will open ---------------------------------- */}
      <div className={styles.band}>
        <section className={styles.sectionTight} aria-labelledby="roles-title">
          <div className={styles.chapterHead}>
            <span className={styles.chapterLabel}>
              02 — What we will open
            </span>
            <span className={styles.chapterNote}>Four first hires</span>
          </div>

          <h2 id="roles-title" className={`${styles.headline} mt-4`}>
            The first four doors <em>we plan to open.</em>
          </h2>

          <div className={styles.roles}>
            {ROLES.map((role) => (
              <article key={role.no} className={styles.roleCard}>
                <div className={styles.roleTop}>
                  <span className={styles.roleNo}>{role.no}</span>
                  <span className={styles.roleTag}>Coming soon</span>
                </div>
                <h3 className={styles.roleTitle}>{role.title}</h3>
                <p className={styles.roleCopy}>{role.copy}</p>
                <p className={styles.roleFoot}>{role.foot}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      {/* ---- 03 · how we work ---------------------------------------- */}
      <div className={styles.band}>
        <section className={styles.sectionTight} aria-labelledby="working-title">
          <div className={styles.chapterHead}>
            <span className={styles.chapterLabel}>03 — How we work</span>
            <span className={styles.chapterNote}>No heroics</span>
          </div>

          <div className={`${styles.twoCol} mt-[clamp(20px,3.6vh,38px)]`}>
            <h2 id="working-title" className={styles.headline}>
              A studio you could <em>actually settle into.</em>
            </h2>
            <ol className={styles.process}>
              {WORKING.map((item) => (
                <li key={item.title} className={styles.processItem}>
                  <div>
                    <h3 className={styles.processTitle}>{item.title}</h3>
                    <p className={styles.processCopy}>{item.copy}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>

      {/* ---- 04 · the process ---------------------------------------- */}
      <div className={styles.band}>
        <section className={styles.sectionTight} aria-labelledby="process-title">
          <div className={styles.chapterHead}>
            <span className={styles.chapterLabel}>04 — When we do open</span>
            <span className={styles.chapterNote}>Two weeks, start to answer</span>
          </div>

          <div className={`${styles.twoCol} mt-[clamp(20px,3.6vh,38px)]`}>
            <h2 id="process-title" className={styles.headline}>
              How hiring here <em>will work.</em>
            </h2>
            <ol className={styles.process}>
              {PROCESS.map((item) => (
                <li key={item.title} className={styles.processItem}>
                  <div>
                    <h3 className={styles.processTitle}>{item.title}</h3>
                    <p className={styles.processCopy}>{item.copy}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>

      {/* ---- interest ------------------------------------------------- */}
      <div className={styles.band}>
        <section
          className={`${styles.sectionTight} ${styles.bandClip}`}
          aria-labelledby="interest-title"
        >
          <div className={styles.interest}>
            <div>
              <h2 id="interest-title" className={styles.interestTitle}>
                Register interest, before the door opens.
              </h2>
              <p className={styles.interestText}>
                Tell us what you do and what you would want to work on. No
                template, no keyword matching — the note goes to the founder&rsquo;s
                inbox, and when a role opens you will hear about it first.
              </p>
            </div>

            <div className={styles.interestActions}>
              <a href={INTEREST_MAIL} className={styles.interestButton}>
                Write to us
                <Arrow size={11} />
              </a>
              <Link href="/about" className={styles.interestGhost}>
                Read about the studio
              </Link>
            </div>
          </div>
        </section>
      </div>
    </SitePage>
  );
}
