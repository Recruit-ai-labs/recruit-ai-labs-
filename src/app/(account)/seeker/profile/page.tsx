import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { readAccount } from "@/lib/account";
import { readActivity } from "@/lib/feed";
import { plural } from "@/lib/feed-types";
import type { FeedActivity } from "@/lib/feed-types";
import { readMedia } from "@/lib/media";
import { emptyMedia, mediaUrl } from "@/lib/media-types";
import { readProfileViewCount } from "@/lib/profile-views";
import {
  completion,
  type CompletionItem,
} from "@/lib/seeker-profile";

import PendingLink, { ButtonSpinner } from "../../../_site/PendingLink";
import {
  EyeIcon,
  PostsIcon,
  ShieldIcon,
} from "../../../_account/seeker/Icons";
import PersonAvatar from "../../../_account/seeker/PersonAvatar";
import ProfileEditor, {
  CompleteRow,
  EditTrigger,
  PhotoControls,
  type ProfileSection,
} from "../../../_account/seeker/ProfileEditor";
import styles from "../../../_account/seeker/seeker.module.scss";

export const metadata: Metadata = { title: "Profile" };

// ------------------------------------------------------------------
//  The profile, and the form of it.
//
//  A cover, an avatar that straddles it, the name and headline — then the
//  sections in the order a reader scans them. Every section is edited in
//  place: the page prints it on the server, and the pencil beside each
//  heading opens that one section in a sheet (see ProfileEditor). The two
//  pictures are uploaded the same way, into `site_media`, and the address
//  the browser is given is short — the bytes come from their own route.
//
//  Dates arrive as "YYYY-MM" from the month inputs; nothing here prints a
//  raw machine string.
// ------------------------------------------------------------------

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "2024-03" → "Mar 2024". Anything unexpected is printed as-is. */
function when(value: string) {
  const [year, month] = value.split("-");
  if (!year) return "";

  const index = Number(month) - 1;
  return MONTHS[index] ? `${MONTHS[index]} ${year}` : year;
}

function span(start: string, end: string, current: boolean) {
  return `${when(start)} — ${current ? "Present" : when(end)}`;
}

/** "https://github.com/aadil" → "github.com/aadil". */
function host(value: string) {
  return value.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

/** The letter a history row stands on when there is no logo for it. */
function mark(value: string) {
  return value.trim().charAt(0).toUpperCase() || "·";
}

// ------------------------------------------------------------------
//  The rail's judgements
//
//  A percentage is a number; a name is a sentence someone can act on.
//  The ladder is indexed by how many of the five sections are closed, so
//  the words and the bar can never disagree.
// ------------------------------------------------------------------
const TIERS = [
  "Just started",
  "Under way",
  "Getting somewhere",
  "Taking shape",
  "Almost there",
  "Complete",
];

/** Which sheet an open line of the checklist should open. */
const SECTION_OF: Record<CompletionItem["key"], ProfileSection> = {
  personal: "header",
  story: "about",
  education: "education",
  skills: "skills",
  experience: "experience",
};

/** The four figures the rail prints, in the order they are read. */
const REACH = [
  { key: "posts", label: "Posts" },
  { key: "reactions", label: "Reactions" },
  { key: "comments", label: "Replies" },
  { key: "followers", label: "Followers" },
] as const;

export default async function ProfilePage() {
  const account = await readAccount();
  if (!account) redirect("/sign-in");

  const profile = account.profile;
  const { items, percent, done, open } = completion(profile);

  // A database that cannot answer costs the rail its figures and the hero
  // its pictures, not the page: the cards fall back to the drawn cover and
  // the initials, and the activity card says so instead of printing zeros.
  //
  // The viewer count rides along here rather than being read by the viewers
  // page, because this rail is the only entry point a phone has — the home
  // rail is hidden below a desktop width.
  const [media, activity, views] = await Promise.all([
    readMedia(account.userId).catch(() => emptyMedia()),
    readActivity(account.userId).catch(() => null as FeedActivity | null),
    readProfileViewCount(account.userId).catch(() => null),
  ]);

  const photo = mediaUrl(account.userId, media.photo);
  const cover = mediaUrl(account.userId, media.cover);

  const name = `${profile.firstName} ${profile.lastName}`.trim();
  const location = [profile.city, profile.country].filter(Boolean).join(", ");
  const person = {
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: account.email,
  };

  // Onboarding collects three links and skips whichever is left blank, so
  // the card is built from what is actually there rather than from three
  // rows, two of which would read "Not set".
  const links = [
    { key: "website", label: "Portfolio", value: profile.website },
    { key: "linkedin", label: "LinkedIn", value: profile.linkedin },
    { key: "github", label: "GitHub", value: profile.github },
  ].filter((link) => Boolean(link.value));

  const page = (
    <div className={styles.layoutProfile}>
      <div className={styles.mainColumn}>
        <section className={styles.profileHero} aria-labelledby="profile-name">
          <div className={styles.heroCover}>
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.heroCoverImg} src={cover} alt="" />
            ) : (
              <span className={styles.heroPattern} aria-hidden="true" />
            )}

            <PhotoControls
              kind="cover"
              variant="cover"
              present={Boolean(media.cover)}
            />
          </div>

          <div className={styles.heroBody}>
            <div className={styles.heroPhoto}>
              <PersonAvatar
                person={person}
                src={photo}
                hero
                className={styles.profileAvatar}
              />

              <PhotoControls
                kind="photo"
                variant="photo"
                present={Boolean(media.photo)}
              />
            </div>

            <div className={styles.heroText}>
              <h1 className={styles.heroTitle} id="profile-name">
                {name || "Your profile"}
              </h1>

              <p className={styles.heroHeadline}>
                {profile.headline ||
                  "No headline yet — this is the one line a recruiter reads first."}
              </p>

              <p className={styles.heroMeta}>
                <span>{location || "Location not set"}</span>
                {profile.username ? <span>@{profile.username}</span> : null}
                <span>{account.email}</span>
              </p>
            </div>

            <div className={styles.heroActions}>
              <EditTrigger section="header" label="Edit profile" solid />

              <PendingLink
                href="/seeker/settings"
                className={styles.buttonGhost}
                pending={<ButtonSpinner />}
              >
                Settings
              </PendingLink>
            </div>
          </div>
        </section>

        <section className={styles.card} aria-labelledby="profile-about">
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle} id="profile-about">
              About
            </h2>

            <div className={styles.cardTools}>
              <EditTrigger section="about" />
            </div>
          </div>

          {profile.about ? (
            <p className={styles.cardText}>{profile.about}</p>
          ) : (
            <p className={styles.emptyLine}>
              Nothing written yet. This is where you say what you enjoy working
              on and what comes next.
            </p>
          )}
        </section>

        <section className={styles.card} aria-labelledby="profile-experience">
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle} id="profile-experience">
              Experience
            </h2>
            <span className={styles.cardNote}>
              {profile.experience.length
                ? `${profile.experience.length} ${
                    profile.experience.length === 1 ? "entry" : "entries"
                  }`
                : "None"}
            </span>

            <div className={styles.cardTools}>
              <EditTrigger section="experience" />
            </div>
          </div>

          {profile.experience.length ? (
            <ol className={styles.entryList}>
              {profile.experience.map((entry, index) => (
                <li className={styles.entry} key={`${entry.company}-${index}`}>
                  <span className={styles.entryMark} aria-hidden="true">
                    {mark(entry.company)}
                  </span>

                  <div>
                    <h3 className={styles.entryTitle}>{entry.title}</h3>
                    <p className={styles.entryMeta}>
                      {[entry.company, entry.employmentType]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <p className={styles.entryDates}>
                      {span(entry.start, entry.end, entry.current)}
                      {entry.location ? ` · ${entry.location}` : ""}
                    </p>
                    {entry.description ? (
                      <p className={styles.entryText}>{entry.description}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className={styles.emptyLine}>
              {profile.experienceConfirmed
                ? "You told us you are just starting out. That stays on your profile as it is."
                : "No experience listed."}
            </p>
          )}
        </section>

        <section className={styles.card} aria-labelledby="profile-education">
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle} id="profile-education">
              Education
            </h2>
            <span className={styles.cardNote}>
              {profile.education.length
                ? `${profile.education.length} ${
                    profile.education.length === 1 ? "entry" : "entries"
                  }`
                : "None"}
            </span>

            <div className={styles.cardTools}>
              <EditTrigger section="education" />
            </div>
          </div>

          {profile.education.length ? (
            <ol className={styles.entryList}>
              {profile.education.map((entry, index) => (
                <li className={styles.entry} key={`${entry.college}-${index}`}>
                  <span className={styles.entryMark} aria-hidden="true">
                    {mark(entry.college)}
                  </span>

                  <div>
                    <h3 className={styles.entryTitle}>{entry.college}</h3>
                    <p className={styles.entryMeta}>
                      {[entry.course, entry.speciality].filter(Boolean).join(" · ")}
                    </p>
                    <p className={styles.entryDates}>
                      {entry.startYear ? `${entry.startYear} — ` : ""}
                      {entry.endYear}
                      {entry.current ? " · Currently studying" : ""}
                      {entry.grade ? ` · ${entry.grade}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className={styles.emptyLine}>No education added.</p>
          )}
        </section>

        <section className={styles.card} aria-labelledby="profile-skills">
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle} id="profile-skills">
              Skills
            </h2>
            <span className={styles.cardNote}>{profile.skills.length || "None"}</span>

            <div className={styles.cardTools}>
              <EditTrigger section="skills" />
            </div>
          </div>

          {profile.skills.length ? (
            <ul className={styles.chips}>
              {profile.skills.map((skill) => (
                <li className={styles.chip} key={skill.name}>
                  {skill.name}
                  <span className={styles.chipLevel}>{skill.level}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyLine}>No skills added yet.</p>
          )}

          <p className={styles.footNote}>
            Levels are what you chose about yourself — they are not a test
            result.
          </p>
        </section>

        <section className={styles.card} aria-labelledby="profile-links">
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle} id="profile-links">
              Links
            </h2>

            <div className={styles.cardTools}>
              {links.length ? (
                <span className={styles.cardNote}>
                  {links.length} {links.length === 1 ? "link" : "links"}
                </span>
              ) : null}

              <EditTrigger section="links" />
            </div>
          </div>

          {links.length ? (
            <div className={styles.rows}>
              {links.map((link) => (
                <div className={styles.row} key={link.key}>
                  <span className={styles.rowLabel}>{link.label}</span>
                  <span className={styles.rowValue}>
                    <a href={link.value} target="_blank" rel="noreferrer noopener">
                      {host(link.value)}
                    </a>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.emptyLine}>
              Nothing linked yet. A portfolio, a LinkedIn or a GitHub is what a
              reader clicks next.
            </p>
          )}
        </section>
      </div>

      <aside className={styles.railRight}>
        <section className={styles.railCard} aria-labelledby="profile-strength">
          <div className={styles.railHead}>
            <h2 className={styles.railTitle} id="profile-strength">
              Profile strength
            </h2>
            <span className={styles.strengthBadge}>{percent}%</span>
          </div>

          <p className={styles.strengthTier}>{TIERS[done]}</p>
          <p className={styles.strengthNote}>
            {open === 0
              ? "Every section has something in it — a recruiter who lands here has enough to place you."
              : `${open} ${
                  open === 1 ? "section" : "sections"
                } still open. Open any line below.`}
          </p>

          <div
            className={styles.strengthBar}
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Profile completion"
          >
            <span
              className={styles.strengthFill}
              style={{ transform: `scaleX(${percent / 100})` }}
            />
          </div>

          <ul className={styles.checkList}>
            {items.map((item) => (
              <CompleteRow
                key={item.key}
                label={item.label}
                done={item.done}
                section={SECTION_OF[item.key]}
              />
            ))}
          </ul>
        </section>

        <section className={styles.railCard} aria-labelledby="profile-activity">
          <div className={styles.railHead}>
            <h2 className={styles.railTitle} id="profile-activity">
              Your activity
            </h2>
            <span className={styles.railChip}>Private</span>
          </div>

          {activity ? (
            <dl className={styles.activityGrid}>
              {REACH.map(({ key, label }) => (
                <div className={styles.activityCell} key={key}>
                  <dt className={styles.activityLabel}>{label}</dt>
                  <dd className={styles.activityValue}>{activity[key]}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className={styles.railNote}>
              These figures could not be read just now. Writing and editing
              still work.
            </p>
          )}

          <PendingLink
            href="/seeker"
            className={styles.viewRow}
            pending={<ButtonSpinner />}
          >
            <PostsIcon className={styles.shortcutIcon} />
            <span>Open your feed</span>
          </PendingLink>

          {/* The one figure a member is most likely to click. It is a link
              even at zero — the page that names the faces also explains why
              an unread profile has none. */}
          <PendingLink
            href="/seeker/profile-views"
            className={styles.viewRow}
            pending={<ButtonSpinner />}
          >
            <EyeIcon className={styles.shortcutIcon} />
            <span>
              {views
                ? `${plural(views.views, "profile view", "profile views")} — see who`
                : "See who viewed your profile"}
            </span>
          </PendingLink>
        </section>

        <section className={styles.railCard} aria-labelledby="profile-private">
          <h2 className={styles.railTitle} id="profile-private">
            Private
          </h2>

          <div className={styles.rows}>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Date of birth</span>
              <span className={styles.rowValue}>
                {profile.dob ? "Hidden" : "Not added"}
              </span>
            </div>

            <div className={styles.row}>
              <span className={styles.rowLabel}>Phone number</span>
              <span className={styles.rowValue}>
                {profile.phone ? "Hidden" : "Not added"}
              </span>
            </div>

            <div className={styles.row}>
              <span className={styles.rowLabel}>Email</span>
              <span className={styles.rowValue}>Hidden</span>
            </div>
          </div>

          <p className={styles.railNote}>
            Only you and the team placing you see these. Everything else on
            this page is yours to edit — every heading has a pencil.
          </p>

          <PendingLink
            href="/seeker/settings"
            className={styles.viewRow}
            pending={<ButtonSpinner />}
          >
            <ShieldIcon className={styles.shortcutIcon} />
            <span>Manage privacy</span>
          </PendingLink>
        </section>
      </aside>
    </div>
  );

  // The cards above are still server output; this is only the island that
  // opens one section at a time on top of them.
  return <ProfileEditor profile={profile}>{page}</ProfileEditor>;
}
