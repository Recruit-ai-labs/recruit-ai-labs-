// ------------------------------------------------------------------
//  Job seeker profile — the shape onboarding collects, and the rules
//  that keep it clean.
//
//  One module serves both callers: the browser checks a step before it
//  lets you move on, and the route handler checks the whole profile
//  again before anything is written to the Clerk account. Every
//  rejection carries the step it belongs to, so the wizard can open the
//  field that needs attention instead of guessing.
//
//  The steps mirror the workspace at D:\New folder: date of birth,
//  personal information, education, skills, experience. Resume upload
//  needs file storage and stays out until that is wired.
// ------------------------------------------------------------------

export const SKILL_LEVELS = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "Expert",
] as const;

export const EMPLOYMENT_TYPES = [
  "Full-time",
  "Part-time",
  "Internship",
  "Freelance",
  "Contract",
  "Self-employed",
  "Volunteer",
] as const;

export type SkillLevel = (typeof SKILL_LEVELS)[number];

export type EducationEntry = {
  course: string;
  speciality: string;
  college: string;
  current: boolean;
  startYear: string;
  endYear: string;
  grade: string;
};

export type SkillEntry = {
  name: string;
  level: SkillLevel;
};

export type ExperienceEntry = {
  title: string;
  company: string;
  employmentType: string;
  location: string;
  current: boolean;
  start: string;
  end: string;
  description: string;
};

export type SeekerProfile = {
  dob: string;
  firstName: string;
  lastName: string;
  username: string;
  phone: string;
  city: string;
  country: string;
  headline: string;
  about: string;
  website: string;
  linkedin: string;
  github: string;
  education: EducationEntry[];
  skills: SkillEntry[];
  experience: ExperienceEntry[];
  /** True once the seeker has answered the experience question, empty or not. */
  experienceConfirmed: boolean;
  /** Set by the server when onboarding is submitted; empty until then. */
  completedAt: string;
};

// Step indexes. Named so the validators below, the wizard and the route
// handler can all talk about "which step failed" without magic numbers.
export const STEP_DOB = 0;
export const STEP_PERSONAL = 1;
export const STEP_EDUCATION = 2;
export const STEP_SKILLS = 3;
export const STEP_EXPERIENCE = 4;

export const PROFILE_STEPS = [
  {
    label: "Date of birth",
    title: "When did it all begin?",
    note: "Stays private. It is never shown on your profile.",
  },
  {
    label: "Personal information",
    title: "Who should we introduce?",
    note: "Your name, where you are, and what you do.",
  },
  {
    label: "Education",
    title: "Where did you study?",
    note: "Add each qualification, most recent first.",
  },
  {
    label: "Skills",
    title: "What are you good at?",
    note: "Pick a level that reflects hands-on experience.",
  },
  {
    label: "Experience",
    title: "Where have you worked?",
    note: "Internships and freelance work count too.",
  },
] as const;

/** A blank profile — also what an account has before onboarding starts. */
export function emptyProfile(): SeekerProfile {
  return {
    dob: "",
    firstName: "",
    lastName: "",
    username: "",
    phone: "",
    city: "",
    country: "",
    headline: "",
    about: "",
    website: "",
    linkedin: "",
    github: "",
    education: [],
    skills: [],
    experience: [],
    experienceConfirmed: false,
    completedAt: "",
  };
}

export function emptyEducation(): EducationEntry {
  return {
    course: "",
    speciality: "",
    college: "",
    current: true,
    startYear: "",
    endYear: "",
    grade: "",
  };
}

export function emptyExperience(): ExperienceEntry {
  return {
    title: "",
    company: "",
    employmentType: "Full-time",
    location: "",
    current: false,
    start: "",
    end: "",
    description: "",
  };
}

export type ProfileResult =
  | { ok: true; profile: SeekerProfile }
  | { ok: false; error: string; step: number };

// Internal: a rejected field carries the step it belongs to so a single
// call can validate the whole profile and still say where to look.
class ProfileIssue extends Error {
  readonly step: number;

  constructor(message: string, step: number) {
    super(message);
    this.step = step;
  }
}

function fail(message: string, step: number): never {
  throw new ProfileIssue(message, step);
}

function readText(
  value: unknown,
  label: string,
  step: number,
  options: { max?: number; required?: boolean } = {},
) {
  const { max = 160, required = false } = options;

  if (value === undefined || value === null) {
    if (required) fail(`Enter your ${label}.`, step);
    return "";
  }

  if (typeof value !== "string") fail(`Check your ${label}.`, step);

  // Control characters would ride along into the feed later; strip the
  // question by refusing them at the door.
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) {
    fail(`Check your ${label}.`, step);
  }

  const text = value.trim();
  if (text.length > max) fail(`Keep your ${label} under ${max} characters.`, step);
  if (required && !text) fail(`Enter your ${label}.`, step);

  return text;
}

function readUrl(value: unknown, label: string, step: number) {
  const text = readText(value, label, step, { max: 500 });
  if (!text) return "";

  let url: URL | null = null;
  try {
    url = new URL(text);
  } catch {
    url = null;
  }

  if (!url || (url.protocol !== "https:" && url.protocol !== "http:")) {
    fail(`Use a full link, starting with https://, for ${label}.`, step);
  }

  return text;
}

function readYear(
  value: unknown,
  label: string,
  step: number,
  options: { required?: boolean; max?: number } = {},
) {
  const { required = false, max = new Date().getFullYear() } = options;
  const text = readText(value, label, step, { max: 4, required });

  if (!text) return "";
  if (!/^\d{4}$/.test(text) || Number(text) < 1900 || Number(text) > max) {
    fail(`Enter a valid ${label}.`, step);
  }

  return text;
}

function readMonth(value: unknown, label: string, step: number) {
  const text = readText(value, label, step, { max: 7, required: true });
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(text)) fail(`Choose a valid ${label}.`, step);
  return text;
}

// Words that would collide with the site's own routes later.
const RESERVED_USERNAMES = [
  "admin",
  "support",
  "recruitai",
  "recruit_ai",
  "settings",
  "api",
  "seeker",
  "onboarding",
];

function buildProfile(input: unknown): SeekerProfile {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    fail("Send a profile to save.", STEP_PERSONAL);
  }

  const source = input as Record<string, unknown>;
  const now = new Date();
  const out = emptyProfile();

  // ---- step 01: date of birth -------------------------------------
  // Optional on purpose: a date of birth nobody wants to share should
  // not hold up the account.
  out.dob = readText(source.dob, "date of birth", STEP_DOB, { max: 10 });
  if (out.dob) {
    const date = new Date(`${out.dob}T00:00:00Z`);
    const valid =
      /^\d{4}-\d{2}-\d{2}$/.test(out.dob) &&
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === out.dob &&
      date <= now &&
      date.getUTCFullYear() >= now.getUTCFullYear() - 120;

    if (!valid) fail("Choose a valid date of birth.", STEP_DOB);
  }

  // ---- step 02: personal information -------------------------------
  out.firstName = readText(source.firstName, "first name", STEP_PERSONAL, {
    max: 80,
    required: true,
  });
  out.lastName = readText(source.lastName, "last name", STEP_PERSONAL, { max: 80 });

  for (const name of [out.firstName, out.lastName]) {
    if (name && !/^[\p{L}\p{M}][\p{L}\p{M} .’'-]*$/u.test(name)) {
      fail("Use your real name, without numbers, links or symbols.", STEP_PERSONAL);
    }
  }

  out.username = readText(source.username, "username", STEP_PERSONAL, {
    max: 30,
    required: true,
  }).toLowerCase();

  if (!/^[a-z][a-z0-9_]{2,29}$/.test(out.username)) {
    fail(
      "Username: 3–30 letters, numbers or underscores, starting with a letter.",
      STEP_PERSONAL,
    );
  }
  if (RESERVED_USERNAMES.includes(out.username)) {
    fail("Choose a different username.", STEP_PERSONAL);
  }

  out.phone = readText(source.phone, "phone number", STEP_PERSONAL, { max: 25 });
  if (out.phone && !/^\+?[\d ()-]{7,25}$/.test(out.phone)) {
    fail("Check your phone number.", STEP_PERSONAL);
  }

  out.city = readText(source.city, "city", STEP_PERSONAL);
  out.country = readText(source.country, "country", STEP_PERSONAL);
  out.headline = readText(source.headline, "headline", STEP_PERSONAL);
  out.about = readText(source.about, "about section", STEP_PERSONAL, { max: 3000 });
  out.website = readUrl(source.website, "your website", STEP_PERSONAL);
  out.linkedin = readUrl(source.linkedin, "LinkedIn profile", STEP_PERSONAL);
  out.github = readUrl(source.github, "GitHub profile", STEP_PERSONAL);

  // ---- step 03: education ------------------------------------------
  const education = source.education ?? [];
  if (!Array.isArray(education)) fail("Check your education entries.", STEP_EDUCATION);
  if (education.length > 10) fail("Add up to 10 education entries.", STEP_EDUCATION);

  out.education = education.map((item, index) => {
    if (!item || typeof item !== "object") {
      fail("Check your education entries.", STEP_EDUCATION);
    }

    const entry = item as Record<string, unknown>;
    const label = `education ${index + 1}`;
    const current = entry.current === true;

    const result: EducationEntry = {
      course: readText(entry.course, `${label} course`, STEP_EDUCATION, {
        max: 160,
        required: true,
      }),
      speciality: readText(entry.speciality, `${label} specialisation`, STEP_EDUCATION, {
        max: 160,
        required: true,
      }),
      college: readText(entry.college, `${label} college`, STEP_EDUCATION, {
        max: 160,
        required: true,
      }),
      current,
      startYear: readYear(entry.startYear, `${label} starting year`, STEP_EDUCATION, {
        max: now.getFullYear() + 15,
      }),
      endYear: readYear(entry.endYear, `${label} passing year`, STEP_EDUCATION, {
        required: true,
        max: now.getFullYear() + 15,
      }),
      grade: readText(entry.grade, `${label} grade`, STEP_EDUCATION, { max: 50 }),
    };

    if (result.startYear && result.endYear < result.startYear) {
      fail("A passing year cannot come before the starting year.", STEP_EDUCATION);
    }
    if (!current && Number(result.endYear) > now.getFullYear()) {
      fail("For a future graduation, mark the course as currently studying.", STEP_EDUCATION);
    }

    return result;
  });

  // ---- step 04: skills ---------------------------------------------
  const skills = source.skills ?? [];
  if (!Array.isArray(skills)) fail("Check your skills.", STEP_SKILLS);
  if (skills.length > 40) fail("Add up to 40 skills.", STEP_SKILLS);

  out.skills = skills.map((item, index) => {
    if (!item || typeof item !== "object") fail("Check your skills.", STEP_SKILLS);

    const entry = item as Record<string, unknown>;
    if (!SKILL_LEVELS.includes(entry.level as SkillLevel)) {
      fail(`Choose a level for skill ${index + 1}.`, STEP_SKILLS);
    }

    return {
      name: readText(entry.name, `skill ${index + 1}`, STEP_SKILLS, {
        max: 80,
        required: true,
      }),
      level: entry.level as SkillLevel,
    };
  });

  const seen = new Set<string>();
  for (const skill of out.skills) {
    const key = skill.name.toLowerCase();
    if (seen.has(key)) fail(`"${skill.name}" is already in your skills.`, STEP_SKILLS);
    seen.add(key);
  }

  // ---- step 05: experience -----------------------------------------
  const experience = source.experience ?? [];
  if (!Array.isArray(experience)) fail("Check your experience entries.", STEP_EXPERIENCE);
  if (experience.length > 20) fail("Add up to 20 experience entries.", STEP_EXPERIENCE);

  const currentMonth = now.toISOString().slice(0, 7);

  out.experience = experience.map((item, index) => {
    if (!item || typeof item !== "object") {
      fail("Check your experience entries.", STEP_EXPERIENCE);
    }

    const entry = item as Record<string, unknown>;
    const label = `experience ${index + 1}`;
    const current = entry.current === true;

    const employmentType = readText(entry.employmentType ?? "Full-time", `${label} type`, STEP_EXPERIENCE, {
      max: 60,
    });
    if (employmentType && !EMPLOYMENT_TYPES.includes(employmentType as (typeof EMPLOYMENT_TYPES)[number])) {
      fail(`Choose a valid employment type for ${label}.`, STEP_EXPERIENCE);
    }

    const result: ExperienceEntry = {
      title: readText(entry.title, `${label} job title`, STEP_EXPERIENCE, {
        max: 160,
        required: true,
      }),
      company: readText(entry.company, `${label} company`, STEP_EXPERIENCE, {
        max: 160,
        required: true,
      }),
      employmentType,
      location: readText(entry.location, `${label} location`, STEP_EXPERIENCE, { max: 160 }),
      current,
      start: readMonth(entry.start, `${label} start date`, STEP_EXPERIENCE),
      end: current ? "" : readMonth(entry.end, `${label} end date`, STEP_EXPERIENCE),
      description: readText(entry.description, `${label} description`, STEP_EXPERIENCE, {
        max: 3000,
      }),
    };

    if (result.start > currentMonth || (result.end && result.end > currentMonth)) {
      fail("Employment dates cannot be in the future.", STEP_EXPERIENCE);
    }
    if (result.end && result.end < result.start) {
      fail("An end date cannot come before the start date.", STEP_EXPERIENCE);
    }

    return result;
  });

  // Answering "I am just starting out" is a real answer; leaving the
  // question untouched is not.
  out.experienceConfirmed = source.experienceConfirmed === true;
  if (!out.experienceConfirmed) {
    fail("Choose whether you have work experience.", STEP_EXPERIENCE);
  }

  return out;
}

/**
 * Validate and normalise a whole profile. `ok: false` names the step that
 * needs attention, which is what lets the wizard jump back to it.
 */
export function parseProfile(input: unknown): ProfileResult {
  try {
    return { ok: true, profile: buildProfile(input) };
  } catch (error) {
    if (error instanceof ProfileIssue) {
      return { ok: false, error: error.message, step: error.step };
    }
    throw error;
  }
}

// ------------------------------------------------------------------
//  Profile completion
//  Five things a profile is judged on while the workspace is still being
//  built. Date of birth is deliberately not one of them: onboarding calls
//  it optional, and a bar that can never reach 100% is a lie.
// ------------------------------------------------------------------

export type CompletionItem = {
  key: "personal" | "story" | "education" | "skills" | "experience";
  label: string;
  done: boolean;
};

/**
 * What a profile already has, and what it is still missing.
 *
 * `done` counts the closed sections and `next` is the first one still open,
 * so a caller can print "2 sections left" and open the right one without
 * walking the list a second time.
 */
export function completion(profile: SeekerProfile): {
  items: CompletionItem[];
  done: number;
  percent: number;
  open: number;
  next: CompletionItem | null;
} {
  const items: CompletionItem[] = [
    {
      key: "personal",
      label: "Name, username and location",
      done: Boolean(
        profile.firstName && profile.username && profile.city && profile.country,
      ),
    },
    {
      key: "story",
      label: "A headline and an about",
      done: Boolean(profile.headline && profile.about),
    },
    {
      key: "education",
      label: "Education",
      done: profile.education.length > 0,
    },
    {
      key: "skills",
      label: "At least one skill",
      done: profile.skills.length > 0,
    },
    {
      key: "experience",
      label: "Experience answered",
      done: profile.experienceConfirmed,
    },
  ];

  const done = items.filter((item) => item.done).length;

  return {
    items,
    done,
    percent: Math.round((done / items.length) * 100),
    open: items.length - done,
    next: items.find((item) => !item.done) ?? null,
  };
}

/** The one question the account gates on: has onboarding been submitted? */
export function isOnboarded(profile: SeekerProfile) {
  return Boolean(profile.completedAt);
}
