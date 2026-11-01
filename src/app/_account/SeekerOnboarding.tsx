"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

import {
  EMPLOYMENT_TYPES,
  PROFILE_STEPS,
  SKILL_LEVELS,
  emptyEducation,
  emptyExperience,
  parseProfile,
  type EducationEntry,
  type ExperienceEntry,
  type SeekerProfile,
  type SkillEntry,
} from "@/lib/seeker-profile";

import styles from "./account.module.scss";
import SignOutButton, { BrandMark } from "./SignOutButton";

// The draft is per-tab: refreshing halfway through must not cost five steps
// of typing, and closing the tab should not leave half a profile behind.
const DRAFT_KEY = "recruit:seeker-onboarding";
const LAST_STEP = PROFILE_STEPS.length - 1;

type ExperienceMode = "starting" | "experience" | "";

// ------------------------------------------------------------------
//  Field primitives
//  Every input on the five steps goes through one of these, so the
//  labels, hints and spacing stay identical from step to step.
// ------------------------------------------------------------------
function TextField({
  label,
  value,
  onChange,
  hint,
  wide,
  ...input
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  wide?: boolean;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const id = useId();

  return (
    <div className={`${styles.field} ${wide ? styles.fieldWide : ""}`}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...input}
      />
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  hint,
  wide,
  ...input
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  wide?: boolean;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange">) {
  const id = useId();

  return (
    <div className={`${styles.field} ${wide ? styles.fieldWide : ""}`}>
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...input}
      />
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  wide,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  wide?: boolean;
}) {
  const id = useId();

  return (
    <div className={`${styles.field} ${wide ? styles.fieldWide : ""}`}>
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

// ------------------------------------------------------------------
//  The wizard
// ------------------------------------------------------------------
export default function SeekerOnboarding({
  email,
  initialProfile,
}: {
  email: string;
  initialProfile: SeekerProfile;
}) {
  const [profile, setProfile] = useState<SeekerProfile>(initialProfile);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [restored, setRestored] = useState(false);

  // "No experience yet" and "some experience" are answers the seeker gives,
  // not something that can be guessed from an empty list — choosing
  // "experience" has to survive until the first entry is typed.
  const [experienceMode, setExperienceMode] = useState<ExperienceMode>(
    initialProfile.experienceConfirmed
      ? initialProfile.experience.length > 0
        ? "experience"
        : "starting"
      : "",
  );

  const headingRef = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);

  useEffect(() => {
    try {
      const draft = window.sessionStorage.getItem(DRAFT_KEY);
      if (draft) {
        const saved = JSON.parse(draft) as Partial<SeekerProfile>;
        const next = { ...initialProfile, ...saved, completedAt: "" };
        setProfile(next);

        if (next.experienceConfirmed) {
          setExperienceMode(next.experience.length > 0 ? "experience" : "starting");
        }
      }
    } catch {
      // An unreadable draft is simply ignored; the form opens blank.
    }
    setRestored(true);
    // The draft is read once, on mount, and never re-read after edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(profile));
    } catch {
      // Private browsing can refuse storage. The form still works.
    }
  }, [profile, restored]);

  // Move the eye (and the screen reader) to the new step's heading. Skipped
  // on first paint so landing on the page does not snatch focus.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  function update<K extends keyof SeekerProfile>(
    key: K,
    value: SeekerProfile[K],
  ) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function updateEducation(index: number, patch: Partial<EducationEntry>) {
    setProfile((current) => ({
      ...current,
      education: current.education.map((entry, position) =>
        position === index ? { ...entry, ...patch } : entry,
      ),
    }));
  }

  function updateSkill(index: number, patch: Partial<SkillEntry>) {
    setProfile((current) => ({
      ...current,
      skills: current.skills.map((entry, position) =>
        position === index ? { ...entry, ...patch } : entry,
      ),
    }));
  }

  function updateExperience(index: number, patch: Partial<ExperienceEntry>) {
    setProfile((current) => ({
      ...current,
      experience: current.experience.map((entry, position) =>
        position === index ? { ...entry, ...patch } : entry,
      ),
    }));
  }

  function chooseExperience(mode: Exclude<ExperienceMode, "">) {
    setExperienceMode(mode);
    setProfile((current) => ({
      ...current,
      experienceConfirmed: true,
      experience:
        mode === "starting"
          ? []
          : current.experience.length > 0
            ? current.experience
            : [emptyExperience()],
    }));
  }

  // One step forward. A problem on an earlier step is impossible unless the
  // seeker went back and cleared a field, so anything at or before the
  // current step blocks; anything later waits for its own step.
  function advance() {
    const check = parseProfile(profile);
    if (!check.ok && check.step <= step) {
      setError(check.error);
      return;
    }

    setError("");
    setStep((current) => Math.min(current + 1, LAST_STEP));
  }

  async function submit() {
    const check = parseProfile(profile);
    if (!check.ok) {
      setStep(check.step);
      setError(check.error);
      return;
    }

    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/account/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });
      const result = (await response.json()) as {
        redirect?: string;
        error?: string;
        step?: number;
      };

      if (!response.ok || !result.redirect) {
        if (typeof result.step === "number") setStep(result.step);
        throw new Error(result.error ?? "Could not save your profile.");
      }

      window.sessionStorage.removeItem(DRAFT_KEY);
      window.location.assign(result.redirect);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not save your profile.",
      );
      setBusy(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const currentStep = PROFILE_STEPS[step];

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <BrandMark />
        <div className={styles.account}>
          <span>{email}</span>
          <SignOutButton />
        </div>
      </header>

      <div className={styles.setupWrap}>
        <aside className={styles.rail}>
          <span className={styles.eyebrow}>Job seeker setup</span>
          <h1 className={styles.railTitle}>Let&rsquo;s build your profile.</h1>
          <p className={styles.railText}>
            Five short steps. Everything can be edited later.
          </p>

          <ol className={styles.steps}>
            {PROFILE_STEPS.map((item, index) => (
              <li key={item.label}>
                <button
                  type="button"
                  className={[
                    index === step ? styles.stepActive : styles.step,
                    index < step ? styles.stepDone : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => {
                    setError("");
                    setStep(index);
                  }}
                  disabled={index > step}
                  aria-current={index === step ? "step" : undefined}
                >
                  <span className={styles.stepNumber}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className={styles.stepLabel}>{item.label}</span>
                </button>
              </li>
            ))}
          </ol>

          <div className={styles.mobileProgress}>
            <span>
              Step {step + 1} of {PROFILE_STEPS.length}
            </span>
            <div className={styles.mobileBar} aria-hidden="true">
              <i
                style={{
                  width: `${((step + 1) / PROFILE_STEPS.length) * 100}%`,
                }}
              />
            </div>
          </div>
        </aside>

        <section className={styles.stepCard} aria-labelledby="step-title">
          <h2
            id="step-title"
            ref={headingRef}
            tabIndex={-1}
            className={styles.stepHeading}
          >
            {currentStep.title}
          </h2>
          <p className={styles.stepNote}>{currentStep.note}</p>

          <div className={styles.stepBody}>
            {step === 0 ? (
              <div className={styles.formGrid}>
                <TextField
                  label="Date of birth"
                  type="date"
                  value={profile.dob}
                  onChange={(value) => update("dob", value)}
                  max={today}
                  wide
                  hint="Optional, and private. It is never shown on your profile."
                />
              </div>
            ) : null}

            {step === 1 ? (
              <div className={styles.formGrid}>
                <TextField
                  label="First name"
                  value={profile.firstName}
                  onChange={(value) => update("firstName", value)}
                  maxLength={80}
                  autoComplete="given-name"
                />
                <TextField
                  label="Last name (optional)"
                  value={profile.lastName}
                  onChange={(value) => update("lastName", value)}
                  maxLength={80}
                  autoComplete="family-name"
                />
                <TextField
                  label="Username"
                  value={profile.username}
                  onChange={(value) => update("username", value)}
                  maxLength={30}
                  autoComplete="username"
                  wide
                  hint="3–30 letters, numbers or underscores, starting with a letter."
                />
                <div className={`${styles.field} ${styles.fieldWide}`}>
                  <label htmlFor="seeker-email">Email</label>
                  <input
                    id="seeker-email"
                    type="email"
                    value={email}
                    readOnly
                    autoComplete="email"
                  />
                  <small>Verified by your sign-in. It stays private.</small>
                </div>
                <TextField
                  label="Phone number (optional)"
                  type="tel"
                  value={profile.phone}
                  onChange={(value) => update("phone", value)}
                  maxLength={25}
                  autoComplete="tel"
                  wide
                />
                <TextField
                  label="City"
                  value={profile.city}
                  onChange={(value) => update("city", value)}
                  autoComplete="address-level2"
                  maxLength={160}
                />
                <TextField
                  label="Country"
                  value={profile.country}
                  onChange={(value) => update("country", value)}
                  autoComplete="country-name"
                  maxLength={160}
                />
                <TextField
                  label="Professional headline"
                  value={profile.headline}
                  onChange={(value) => update("headline", value)}
                  maxLength={160}
                  wide
                  placeholder="e.g. Frontend developer · Building accessible experiences"
                />
                <TextAreaField
                  label="About you"
                  value={profile.about}
                  onChange={(value) => update("about", value)}
                  rows={4}
                  maxLength={3000}
                  wide
                  placeholder="What do you enjoy working on? What comes next?"
                />
                <TextField
                  label="LinkedIn profile"
                  type="url"
                  value={profile.linkedin}
                  onChange={(value) => update("linkedin", value)}
                  maxLength={500}
                  wide
                  placeholder="https://www.linkedin.com/in/your-name"
                />
                <TextField
                  label="GitHub profile"
                  type="url"
                  value={profile.github}
                  onChange={(value) => update("github", value)}
                  maxLength={500}
                  wide
                  placeholder="https://github.com/your-name"
                  hint="Optional — add it if your work lives on GitHub."
                />
                <TextField
                  label="Portfolio or website"
                  type="url"
                  value={profile.website}
                  onChange={(value) => update("website", value)}
                  maxLength={500}
                  wide
                  placeholder="https://"
                  hint="Optional — a portfolio, personal site or case-study page."
                />
              </div>
            ) : null}

            {step === 2 ? (
              <div>
                <p className={styles.stepNote}>
                  Add a qualification, or continue if you have none yet.
                </p>

                {profile.education.map((entry, index) => (
                  <div className={styles.entry} key={index}>
                    <div className={styles.entryHead}>
                      <span className={styles.entryTitle}>
                        Education {index + 1}
                      </span>
                      <button
                        type="button"
                        className={styles.remove}
                        onClick={() =>
                          update(
                            "education",
                            profile.education.filter(
                              (_, position) => position !== index,
                            ),
                          )
                        }
                      >
                        Remove
                      </button>
                    </div>

                    <div className={styles.formGrid}>
                      <TextField
                        label="Course or degree"
                        value={entry.course}
                        onChange={(value) =>
                          updateEducation(index, { course: value })
                        }
                        maxLength={160}
                      />
                      <TextField
                        label="Specialisation"
                        value={entry.speciality}
                        onChange={(value) =>
                          updateEducation(index, { speciality: value })
                        }
                        maxLength={160}
                      />
                      <TextField
                        label="College or university"
                        value={entry.college}
                        onChange={(value) =>
                          updateEducation(index, { college: value })
                        }
                        maxLength={160}
                        wide
                      />
                      <div className={styles.choiceRow}>
                        <label className={styles.radio}>
                          <input
                            type="radio"
                            name={`studying-${index}`}
                            checked={entry.current}
                            onChange={() =>
                              updateEducation(index, { current: true })
                            }
                          />
                          Currently studying
                        </label>
                        <label className={styles.radio}>
                          <input
                            type="radio"
                            name={`studying-${index}`}
                            checked={!entry.current}
                            onChange={() =>
                              updateEducation(index, { current: false })
                            }
                          />
                          Completed
                        </label>
                      </div>
                      <TextField
                        label="Starting year"
                        inputMode="numeric"
                        value={entry.startYear}
                        onChange={(value) =>
                          updateEducation(index, { startYear: value })
                        }
                        maxLength={4}
                      />
                      <TextField
                        label={
                          entry.current ? "Expected passing year" : "Passing year"
                        }
                        inputMode="numeric"
                        value={entry.endYear}
                        onChange={(value) =>
                          updateEducation(index, { endYear: value })
                        }
                        maxLength={4}
                      />
                      <TextField
                        label="Grade or CGPA (optional)"
                        value={entry.grade}
                        onChange={(value) =>
                          updateEducation(index, { grade: value })
                        }
                        maxLength={50}
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  className={styles.addButton}
                  disabled={profile.education.length >= 10}
                  onClick={() =>
                    update("education", [...profile.education, emptyEducation()])
                  }
                >
                  + Add education
                </button>
              </div>
            ) : null}

            {step === 3 ? (
              <div>
                <p className={styles.stepNote}>
                  Choose the level that reflects your hands-on experience.
                </p>

                {profile.skills.map((entry, index) => (
                  <div className={styles.skillRow} key={index}>
                    <TextField
                      label={`Skill ${index + 1}`}
                      value={entry.name}
                      onChange={(value) => updateSkill(index, { name: value })}
                      maxLength={80}
                    />
                    <SelectField
                      label="Level"
                      value={entry.level}
                      onChange={(value) =>
                        updateSkill(index, {
                          level: value as SkillEntry["level"],
                        })
                      }
                      options={SKILL_LEVELS}
                    />
                    <button
                      type="button"
                      className={styles.skillRemove}
                      aria-label={`Remove skill ${index + 1}`}
                      onClick={() =>
                        update(
                          "skills",
                          profile.skills.filter(
                            (_, position) => position !== index,
                          ),
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  className={styles.addButton}
                  disabled={profile.skills.length >= 40}
                  onClick={() =>
                    update("skills", [
                      ...profile.skills,
                      { name: "", level: "Intermediate" },
                    ])
                  }
                >
                  + Add a skill
                </button>
              </div>
            ) : null}

            {step === 4 ? (
              <div>
                <div className={styles.choiceRow}>
                  <label className={styles.radio}>
                    <input
                      type="radio"
                      name="experience-mode"
                      checked={experienceMode === "starting"}
                      onChange={() => chooseExperience("starting")}
                    />
                    I&apos;m just starting out
                  </label>
                  <label className={styles.radio}>
                    <input
                      type="radio"
                      name="experience-mode"
                      checked={experienceMode === "experience"}
                      onChange={() => chooseExperience("experience")}
                    />
                    I have work experience
                  </label>
                </div>

                {experienceMode === "experience" ? (
                  <div className={styles.entries}>
                    {profile.experience.map((entry, index) => (
                      <div className={styles.entry} key={index}>
                        <div className={styles.entryHead}>
                          <span className={styles.entryTitle}>
                            Experience {index + 1}
                          </span>
                          <button
                            type="button"
                            className={styles.remove}
                            onClick={() =>
                              update(
                                "experience",
                                profile.experience.filter(
                                  (_, position) => position !== index,
                                ),
                              )
                            }
                          >
                            Remove
                          </button>
                        </div>

                        <div className={styles.formGrid}>
                          <TextField
                            label="Job title"
                            value={entry.title}
                            onChange={(value) =>
                              updateExperience(index, { title: value })
                            }
                            maxLength={160}
                          />
                          <TextField
                            label="Company or organisation"
                            value={entry.company}
                            onChange={(value) =>
                              updateExperience(index, { company: value })
                            }
                            maxLength={160}
                          />
                          <SelectField
                            label="Employment type"
                            value={entry.employmentType}
                            onChange={(value) =>
                              updateExperience(index, { employmentType: value })
                            }
                            options={EMPLOYMENT_TYPES}
                          />
                          <TextField
                            label="Location"
                            value={entry.location}
                            onChange={(value) =>
                              updateExperience(index, { location: value })
                            }
                            maxLength={160}
                          />
                          <label className={`${styles.radio} ${styles.fieldWide}`}>
                            <input
                              type="checkbox"
                              checked={entry.current}
                              onChange={(event) =>
                                updateExperience(index, {
                                  current: event.target.checked,
                                })
                              }
                            />
                            I currently work here
                          </label>
                          <TextField
                            label="Start date"
                            type="month"
                            value={entry.start}
                            onChange={(value) =>
                              updateExperience(index, { start: value })
                            }
                            max={new Date().toISOString().slice(0, 7)}
                          />
                          {!entry.current ? (
                            <TextField
                              label="End date"
                              type="month"
                              value={entry.end}
                              onChange={(value) =>
                                updateExperience(index, { end: value })
                              }
                              min={entry.start || undefined}
                              max={new Date().toISOString().slice(0, 7)}
                            />
                          ) : null}
                          <TextAreaField
                            label="What did you work on?"
                            value={entry.description}
                            onChange={(value) =>
                              updateExperience(index, { description: value })
                            }
                            rows={4}
                            maxLength={3000}
                            wide
                            placeholder="Responsibilities, projects and results"
                          />
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      className={styles.addButton}
                      disabled={profile.experience.length >= 20}
                      onClick={() =>
                        update("experience", [
                          ...profile.experience,
                          emptyExperience(),
                        ])
                      }
                    >
                      + Add experience
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}

          <footer className={styles.stepFooter}>
            {step > 0 ? (
              <button
                type="button"
                className={styles.ghost}
                disabled={busy}
                onClick={() => {
                  setError("");
                  setStep((current) => Math.max(current - 1, 0));
                }}
              >
                Back
              </button>
            ) : null}

            {step < LAST_STEP ? (
              <button type="button" className={styles.primary} onClick={advance}>
                Continue
                <span aria-hidden="true">→</span>
              </button>
            ) : (
              <button
                type="button"
                className={styles.primary}
                onClick={submit}
                disabled={busy}
              >
                {busy ? "Saving…" : "Finish setup"}
              </button>
            )}
          </footer>
        </section>
      </div>
    </main>
  );
}
