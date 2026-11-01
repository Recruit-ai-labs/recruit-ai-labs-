"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import {
  MAX_MEDIA_LENGTH,
  MEDIA_ACCEPT,
  MEDIA_MAX_EDGE,
  type MediaKind,
} from "@/lib/media-types";
import {
  EMPLOYMENT_TYPES,
  SKILL_LEVELS,
  emptyEducation,
  emptyExperience,
  type EducationEntry,
  type ExperienceEntry,
  type SeekerProfile,
  type SkillEntry,
} from "@/lib/seeker-profile";
import { shrinkImage } from "@/lib/shrink-image";

import { CloseIcon, ImageIcon, PencilIcon, TrashIcon } from "./Icons";
import useOverlay from "./useOverlay";
import styles from "./seeker.module.scss";

// ------------------------------------------------------------------
//  Profile — the editable form of it.
//
//  The page itself stays a server component: it reads the account, prints
//  the sections and knows nothing about forms. This file is the small
//  client island around it. The page wraps its server-rendered cards in
//  the provider, and the only client parts inside them are the two
//  controls below — a pencil that opens one section of the record, and a
//  button that changes one photograph. Everything that is not being
//  edited stays exactly as it was rendered on the server.
//
//  One section at a time, one sheet at a time. The whole profile is sent
//  on save because the server validates the whole record; a section that
//  was not open can only be unchanged, so it can only be valid.
// ------------------------------------------------------------------

export type ProfileSection =
  | "header"
  | "about"
  | "experience"
  | "education"
  | "skills"
  | "links";

const COPY: Record<ProfileSection, { title: string; note: string }> = {
  header: {
    title: "Your details",
    note: "The name, headline and location anyone reads first.",
  },
  about: {
    title: "About",
    note: "A few sentences on what you enjoy working on and what comes next.",
  },
  experience: {
    title: "Experience",
    note: "Roles, internships and freelance work — most recent first.",
  },
  education: {
    title: "Education",
    note: "Each course or degree, with the years you were there.",
  },
  skills: {
    title: "Skills",
    note: "Levels are what you chose about yourself — not a test result.",
  },
  links: {
    title: "Links",
    note: "Full addresses, starting with https://.",
  },
};

// Which section a rejected step belongs to, so a message from the server
// can say where to look instead of only what is wrong.
const SECTION_OF_STEP: Record<number, string> = {
  0: "Your details",
  1: "Your details",
  2: "Education",
  3: "Skills",
  4: "Experience",
};

type TextKey =
  | "firstName"
  | "lastName"
  | "username"
  | "headline"
  | "city"
  | "country"
  | "about"
  | "website"
  | "linkedin"
  | "github";

type TextField = {
  key: TextKey;
  label: string;
  max?: number;
  wide?: boolean;
  area?: boolean;
  hint?: string;
  placeholder?: string;
  focus?: boolean;
};

const HEADER_FIELDS: TextField[] = [
  { key: "firstName", label: "First name", max: 80, focus: true },
  { key: "lastName", label: "Last name", max: 80 },
  {
    key: "username",
    label: "Username",
    max: 30,
    hint: "3–30 letters, numbers or underscores.",
  },
  {
    key: "headline",
    label: "Headline",
    max: 160,
    wide: true,
    placeholder: "Frontend developer building quiet interfaces",
  },
  { key: "city", label: "City", max: 160 },
  { key: "country", label: "Country", max: 160 },
];

const ABOUT_FIELDS: TextField[] = [
  {
    key: "about",
    label: "About",
    max: 3000,
    wide: true,
    area: true,
    focus: true,
    placeholder:
      "What you enjoy building, the tools you reach for, and what you want next.",
  },
];

const LINK_FIELDS: TextField[] = [
  {
    key: "website",
    label: "Portfolio",
    max: 500,
    wide: true,
    focus: true,
    placeholder: "https://your-site.com",
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    max: 500,
    wide: true,
    placeholder: "https://linkedin.com/in/you",
  },
  {
    key: "github",
    label: "GitHub",
    max: 500,
    wide: true,
    placeholder: "https://github.com/you",
  },
];

type EntryField = {
  key: string;
  label: string;
  kind?: "text" | "area" | "month" | "year" | "select" | "check";
  options?: readonly string[];
  max?: number;
  wide?: boolean;
  placeholder?: string;
};

const EXPERIENCE_FIELDS: EntryField[] = [
  { key: "title", label: "Job title", max: 160 },
  { key: "company", label: "Company", max: 160 },
  {
    key: "employmentType",
    label: "Type",
    kind: "select",
    options: EMPLOYMENT_TYPES,
  },
  { key: "location", label: "Location", max: 160 },
  { key: "start", label: "Started", kind: "month" },
  { key: "end", label: "Ended", kind: "month" },
  { key: "current", label: "I still work here", kind: "check", wide: true },
  {
    key: "description",
    label: "What you did",
    kind: "area",
    max: 3000,
    wide: true,
  },
];

const EDUCATION_FIELDS: EntryField[] = [
  { key: "college", label: "College", max: 160, wide: true },
  { key: "course", label: "Course", max: 160 },
  { key: "speciality", label: "Speciality", max: 160 },
  { key: "startYear", label: "From", kind: "year" },
  { key: "endYear", label: "Passing year", kind: "year" },
  { key: "grade", label: "Grade", max: 50 },
  { key: "current", label: "Currently studying", kind: "check", wide: true },
];

// ------------------------------------------------------------------
//  Context
// ------------------------------------------------------------------
type Editor = {
  profile: SeekerProfile;
  open: (section: ProfileSection) => void;
  uploadPhoto: (kind: MediaKind) => void;
  removePhoto: (kind: MediaKind) => void;
  mediaBusy: MediaKind | null;
};

const EditorContext = createContext<Editor | null>(null);

// ------------------------------------------------------------------
//  Controls the server page places inside its own markup
// ------------------------------------------------------------------

/**
 * One pencil. Quiet inside a card heading, ink in the hero — the only
 * difference between "edit this section" and "this is your profile".
 */
export function EditTrigger({
  section,
  label = "Edit",
  solid = false,
}: {
  section: ProfileSection;
  label?: string;
  solid?: boolean;
}) {
  const editor = useContext(EditorContext);
  if (!editor) return null;

  return (
    <button
      type="button"
      className={solid ? styles.editTriggerSolid : styles.editTrigger}
      onClick={() => editor.open(section)}
    >
      {solid ? null : <PencilIcon className={styles.editTriggerIcon} />}
      {label}
    </button>
  );
}

/**
 * One line of the strength checklist.
 *
 * A closed section is a statement; an open one is a way in — pressing it
 * opens that section in the sheet, so the rail can repair the profile
 * instead of only describing it.
 */
export function CompleteRow({
  section,
  label,
  done,
}: {
  section: ProfileSection;
  label: string;
  done: boolean;
}) {
  const editor = useContext(EditorContext);
  const mark = (
    <span
      aria-hidden="true"
      className={done ? styles.checkMarkDone : styles.checkMark}
    >
      {done ? "✓" : "·"}
    </span>
  );

  if (done || !editor) {
    return (
      <li className={done ? styles.checkRowDone : styles.checkRow}>
        {mark}
        <span className={styles.checkLabel}>{label}</span>
        <span className={styles.srOnly}>{done ? " — done" : " — still open"}</span>
      </li>
    );
  }

  return (
    <li className={styles.checkRow}>
      <button
        type="button"
        className={styles.checkOpen}
        onClick={() => editor.open(section)}
      >
        {mark}
        <span className={styles.checkLabel}>{label}</span>
        <span className={styles.checkGo} aria-hidden="true">
          →
        </span>
        <span className={styles.srOnly}> — open this section</span>
      </button>
    </li>
  );
}

/**
 * Change or remove one picture.
 *
 * On the cover it is a pill in the corner; on the avatar it is a small
 * disc that sits on the rim of the portrait, where every product the
 * reader has used before puts it.
 */
export function PhotoControls({
  kind,
  variant,
  present,
}: {
  kind: MediaKind;
  variant: "cover" | "photo";
  present: boolean;
}) {
  const editor = useContext(EditorContext);
  if (!editor) return null;

  const busy = editor.mediaBusy === kind;
  const change = present ? "Change" : "Add";

  if (variant === "photo") {
    return (
      <div className={styles.avatarTools}>
        <button
          type="button"
          className={styles.avatarEdit}
          onClick={() => editor.uploadPhoto(kind)}
          disabled={busy}
          aria-label={`${change} profile photo`}
          title={`${change} profile photo`}
        >
          <PencilIcon className={styles.avatarEditIcon} />
        </button>

        {present ? (
          <button
            type="button"
            className={styles.avatarRemove}
            onClick={() => editor.removePhoto(kind)}
            disabled={busy}
            aria-label="Remove profile photo"
            title="Remove profile photo"
          >
            <TrashIcon className={styles.avatarEditIcon} />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={styles.coverTools}>
      <button
        type="button"
        className={styles.photoButton}
        onClick={() => editor.uploadPhoto(kind)}
        disabled={busy}
      >
        <ImageIcon className={styles.photoButtonIcon} />
        {busy ? "Saving…" : `${change} cover`}
      </button>

      {present ? (
        <button
          type="button"
          className={styles.photoRemove}
          onClick={() => editor.removePhoto(kind)}
          disabled={busy}
          aria-label="Remove cover photo"
          title="Remove cover photo"
        >
          <TrashIcon className={styles.photoButtonIcon} />
        </button>
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------------
//  Fields
// ------------------------------------------------------------------
function FieldShell({
  label,
  wide,
  hint,
  children,
}: {
  label: string;
  wide?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label
      className={[styles.editField, wide ? styles.editFieldWide : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <span className={styles.editLabel}>{label}</span>
      {children}
      {hint ? <small className={styles.editHint}>{hint}</small> : null}
    </label>
  );
}

function EntryFieldInput({
  field,
  value,
  onChange,
}: {
  field: EntryField;
  value: string | boolean;
  onChange: (value: string | boolean) => void;
}) {
  if (field.kind === "check") {
    return (
      <label className={`${styles.editField} ${styles.editCheck}`}>
        <input
          type="checkbox"
          checked={value === true}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>{field.label}</span>
      </label>
    );
  }

  const text = typeof value === "string" ? value : "";

  return (
    <FieldShell label={field.label} wide={field.wide}>
      {field.kind === "select" ? (
        <select value={text} onChange={(event) => onChange(event.target.value)}>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : field.kind === "area" ? (
        <textarea
          value={text}
          rows={4}
          maxLength={field.max ?? 3000}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          type={field.kind === "month" ? "month" : "text"}
          value={text}
          inputMode={field.kind === "year" ? "numeric" : undefined}
          maxLength={field.kind === "year" ? 4 : field.max}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </FieldShell>
  );
}

function EntryCard({
  index,
  title,
  onRemove,
  children,
}: {
  index: number;
  title: string;
  onRemove: () => void;
  children: ReactNode;
}) {
  return (
    <div className={styles.editEntry}>
      <div className={styles.editEntryHead}>
        <span className={styles.editEntryIndex}>
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className={styles.editEntryTitle}>{title || "New entry"}</span>
        <button
          type="button"
          className={styles.editEntryRemove}
          onClick={onRemove}
          aria-label={`Remove ${title || "this entry"}`}
          title="Remove"
        >
          <TrashIcon className={styles.editEntryRemoveIcon} />
        </button>
      </div>

      <div className={styles.editGrid}>{children}</div>
    </div>
  );
}

// ------------------------------------------------------------------
//  Provider
// ------------------------------------------------------------------
export default function ProfileEditor({
  profile,
  children,
}: {
  profile: SeekerProfile;
  children: ReactNode;
}) {
  const router = useRouter();

  const [section, setSection] = useState<ProfileSection | null>(null);
  const [draft, setDraft] = useState<SeekerProfile>(profile);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [mediaBusy, setMediaBusy] = useState<MediaKind | null>(null);
  const [mediaError, setMediaError] = useState("");

  const picker = useRef<HTMLInputElement>(null);
  const picking = useRef<MediaKind>("photo");

  const close = useCallback(() => {
    if (busy) return;
    setSection(null);
    setError("");
  }, [busy]);

  useOverlay(section !== null, close);

  // A section always opens on what is saved now, never on a draft left
  // behind by the previous sheet.
  useEffect(() => {
    if (section) setDraft(profile);
  }, [section, profile]);

  function open(next: ProfileSection) {
    setError("");
    setDraft(profile);
    setSection(next);
  }

  function patchText(key: TextKey, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function patchExperience(index: number, patch: Partial<ExperienceEntry>) {
    setDraft((current) => ({
      ...current,
      experience: current.experience.map((entry, at) =>
        at === index ? { ...entry, ...patch } : entry,
      ),
    }));
  }

  function patchEducation(index: number, patch: Partial<EducationEntry>) {
    setDraft((current) => ({
      ...current,
      education: current.education.map((entry, at) =>
        at === index ? { ...entry, ...patch } : entry,
      ),
    }));
  }

  function patchSkill(index: number, patch: Partial<SkillEntry>) {
    setDraft((current) => ({
      ...current,
      skills: current.skills.map((entry, at) =>
        at === index ? { ...entry, ...patch } : entry,
      ),
    }));
  }

  async function save() {
    if (busy) return;

    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: draft }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        step?: number;
      };

      if (!response.ok) {
        const where =
          payload.step === undefined ? "" : ` (${SECTION_OF_STEP[payload.step]})`;
        throw new Error(`${payload.error ?? "Could not save that."}${where}`);
      }

      setSection(null);
      router.refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not save that.");
    } finally {
      setBusy(false);
    }
  }

  const uploadPhoto = useCallback((kind: MediaKind) => {
    picking.current = kind;
    setMediaError("");
    picker.current?.click();
  }, []);

  const removePhoto = useCallback(
    async (kind: MediaKind) => {
      setMediaBusy(kind);
      setMediaError("");

      try {
        const response = await fetch("/api/account/media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind, data: "" }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(payload.error ?? "Could not remove that picture.");
        }

        router.refresh();
      } catch (problem) {
        setMediaError(
          problem instanceof Error ? problem.message : "Could not remove that picture.",
        );
      } finally {
        setMediaBusy(null);
      }
    },
    [router],
  );

  async function onPicked(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const kind = picking.current;
    setMediaBusy(kind);
    setMediaError("");

    try {
      const data = await shrinkImage(file, {
        maxEdge: MEDIA_MAX_EDGE[kind],
        maxLength: MAX_MEDIA_LENGTH - 20_000,
      });

      const response = await fetch("/api/account/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, data }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error ?? "Could not save that picture.");
      }

      router.refresh();
    } catch (problem) {
      setMediaError(
        problem instanceof Error ? problem.message : "Could not save that picture.",
      );
    } finally {
      setMediaBusy(null);
    }
  }

  const copy = section ? COPY[section] : null;

  const editor: Editor = {
    profile,
    open,
    uploadPhoto,
    removePhoto,
    mediaBusy,
  };

  return (
    <EditorContext.Provider value={editor}>
      <input
        ref={picker}
        type="file"
        accept={MEDIA_ACCEPT}
        className={styles.srOnly}
        onChange={onPicked}
        tabIndex={-1}
        aria-hidden="true"
      />

      {children}

      {mediaError ? (
        <div className={styles.mediaToast} role="alert">
          <span>{mediaError}</span>
          <button
            type="button"
            className={styles.mediaToastClose}
            onClick={() => setMediaError("")}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ) : null}

      {section && copy
        ? createPortal(
            <div className={styles.overlay}>
              <button
                type="button"
                className={styles.backdrop}
                aria-label="Close the editor"
                onClick={close}
              />

              <div
                className={styles.sheet}
                role="dialog"
                aria-modal="true"
                aria-labelledby="profile-edit-title"
              >
                <header className={styles.sheetHead}>
                  <div>
                    <h2 className={styles.sheetTitle} id="profile-edit-title">
                      {copy.title}
                    </h2>
                    <p className={styles.sheetSub}>{copy.note}</p>
                  </div>

                  <button
                    type="button"
                    className={styles.sheetClose}
                    aria-label="Close the editor"
                    onClick={close}
                    disabled={busy}
                  >
                    <CloseIcon className={styles.sheetCloseIcon} />
                  </button>
                </header>

                {section === "header" ? (
                  <div className={styles.editGrid}>
                    {HEADER_FIELDS.map((field) => {
                      const value = draft[field.key];

                      return (
                        <FieldShell
                          key={field.key}
                          label={field.label}
                          wide={field.wide}
                          hint={field.hint}
                        >
                          <input
                            type="text"
                            value={typeof value === "string" ? value : ""}
                            maxLength={field.max}
                            placeholder={field.placeholder}
                            autoFocus={field.focus}
                            onChange={(event) =>
                              patchText(field.key, event.target.value)
                            }
                          />
                        </FieldShell>
                      );
                    })}
                  </div>
                ) : null}

                {section === "about" ? (
                  <div className={styles.editGrid}>
                    {ABOUT_FIELDS.map((field) => (
                      <FieldShell key={field.key} label={field.label} wide>
                        <textarea
                          value={draft.about}
                          rows={8}
                          maxLength={field.max}
                          placeholder={field.placeholder}
                          autoFocus
                          onChange={(event) =>
                            patchText(field.key, event.target.value)
                          }
                        />
                      </FieldShell>
                    ))}
                  </div>
                ) : null}

                {section === "links" ? (
                  <div className={styles.editGrid}>
                    {LINK_FIELDS.map((field) => (
                      <FieldShell key={field.key} label={field.label} wide>
                        <input
                          type="text"
                          value={draft[field.key]}
                          maxLength={field.max}
                          placeholder={field.placeholder}
                          autoFocus={field.focus}
                          inputMode="url"
                          onChange={(event) =>
                            patchText(field.key, event.target.value)
                          }
                        />
                      </FieldShell>
                    ))}
                  </div>
                ) : null}

                {section === "experience" ? (
                  <>
                    {draft.experience.map((entry, index) => (
                      <EntryCard
                        key={`experience-${index}`}
                        index={index}
                        title={entry.title || entry.company}
                        onRemove={() =>
                          setDraft((current) => ({
                            ...current,
                            experience: current.experience.filter(
                              (_, at) => at !== index,
                            ),
                          }))
                        }
                      >
                        {EXPERIENCE_FIELDS.map((field) => (
                          <EntryFieldInput
                            key={field.key}
                            field={field}
                            value={entry[field.key as keyof ExperienceEntry]}
                            onChange={(value) =>
                              patchExperience(index, {
                                [field.key]: value,
                              } as Partial<ExperienceEntry>)
                            }
                          />
                        ))}
                      </EntryCard>
                    ))}

                    <button
                      type="button"
                      className={styles.editAdd}
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          experience: [...current.experience, emptyExperience()],
                        }))
                      }
                    >
                      Add a role
                    </button>
                  </>
                ) : null}

                {section === "education" ? (
                  <>
                    {draft.education.map((entry, index) => (
                      <EntryCard
                        key={`education-${index}`}
                        index={index}
                        title={entry.college || entry.course}
                        onRemove={() =>
                          setDraft((current) => ({
                            ...current,
                            education: current.education.filter(
                              (_, at) => at !== index,
                            ),
                          }))
                        }
                      >
                        {EDUCATION_FIELDS.map((field) => (
                          <EntryFieldInput
                            key={field.key}
                            field={field}
                            value={entry[field.key as keyof EducationEntry]}
                            onChange={(value) =>
                              patchEducation(index, {
                                [field.key]: value,
                              } as Partial<EducationEntry>)
                            }
                          />
                        ))}
                      </EntryCard>
                    ))}

                    <button
                      type="button"
                      className={styles.editAdd}
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          education: [...current.education, emptyEducation()],
                        }))
                      }
                    >
                      Add education
                    </button>
                  </>
                ) : null}

                {section === "skills" ? (
                  <>
                    {draft.skills.map((entry, index) => (
                      <div className={styles.editSkillRow} key={`skill-${index}`}>
                        <input
                          type="text"
                          className={styles.editSkillName}
                          value={entry.name}
                          maxLength={80}
                          placeholder="React"
                          aria-label={`Skill ${index + 1}`}
                          onChange={(event) =>
                            patchSkill(index, { name: event.target.value })
                          }
                        />

                        <select
                          className={styles.editSkillLevel}
                          value={entry.level}
                          aria-label={`Level for skill ${index + 1}`}
                          onChange={(event) =>
                            patchSkill(index, {
                              level: event.target.value as SkillEntry["level"],
                            })
                          }
                        >
                          {SKILL_LEVELS.map((level) => (
                            <option key={level} value={level}>
                              {level}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          className={styles.editEntryRemove}
                          onClick={() =>
                            setDraft((current) => ({
                              ...current,
                              skills: current.skills.filter((_, at) => at !== index),
                            }))
                          }
                          aria-label={`Remove ${entry.name || "skill"}`}
                        >
                          <TrashIcon className={styles.editEntryRemoveIcon} />
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      className={styles.editAdd}
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          skills: [
                            ...current.skills,
                            { name: "", level: "Intermediate" },
                          ],
                        }))
                      }
                    >
                      Add a skill
                    </button>
                  </>
                ) : null}

                {error ? (
                  <p className={styles.editError} role="alert">
                    {error}
                  </p>
                ) : null}

                <div className={styles.editFoot}>
                  <button
                    type="button"
                    className={styles.editCancel}
                    onClick={close}
                    disabled={busy}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className={styles.editSave}
                    onClick={() => void save()}
                    disabled={busy}
                  >
                    {busy ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </EditorContext.Provider>
  );
}
