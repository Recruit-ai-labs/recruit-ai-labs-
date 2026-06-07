// ============================================================
// src/lib/data-store.ts  —  Recruit AI · Central Data Store
// ============================================================

import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";

// ─── Types ───────────────────────────────────────────────────

export interface CandidateProfile {
  candidateId: string;
  jobId: string;
  name: string;
  email: string;
  resumeText: string;
  createdAt: string;
  status: "onboarding" | "interviewing" | "submitted" | "evaluated";

  // Hidden Tech DNA — populated during interview
  techDNA?: TechDNA;

  // AI summary — injected after submission
  aiSummary?: AISummary;
}

export interface TechDNA {
  behavioralCues: BehavioralCue[];
  logicalDepthScore: number;          // 0–100
  technicalDecisionPatterns: string[];
  responseVelocity: number[];         // ms per answer
  confidenceMarkers: number[];        // 0–1 per question
  totalTimeSpentMs: number;
}

export interface BehavioralCue {
  questionIndex: number;
  editCount: number;
  timeOnQuestion: number;
  deletedWords: number;
  pasteDetected: boolean;
}

export interface AISummary {
  overallScore: number;             // 0–100
  strengths: string[];
  weaknesses: string[];
  hiringRecommendation: "Strong Yes" | "Yes" | "Maybe" | "No";
  technicalDepth: string;
  communicationClarity: string;
  detailedAnalysis: string;
  generatedAt: string;
}

export interface JobRecord {
  jobId: string;
  title: string;
  description: string;
  questions: InterviewQuestion[];
  createdAt: string;
  candidates: CandidateProfile[];
}

export interface InterviewQuestion {
  id: string;
  text: string;
  type: "technical" | "behavioral" | "situational";
  expectedKeywords?: string[];
}

// ─── Original full DB schema (used by existing routes) ───────

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  resumeUrl?: string;
  resumeText?: string;
  createdAt: string;
}

export interface Job {
  id: string;
  title: string;
  description?: string;
  requirements?: string;
  status?: string;
  location?: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salary_min?: number | null;
  salary_max?: number | null;
  createdAt: string;
  created_at?: string;
  created?: string;
}

export interface Application {
  id: string;
  jobId: string;
  candidateId: string;
  stage: string;
  aiMatchScore: number | null;
  source: string;
  appliedAt: string;
  lastActivityAt: string;
}

export interface Interview {
  id: string;
  applicationId: string | null;
  jobId: string | null;
  scheduledAt: string;
  calendarEventId: string | null;
  videoLink: string | null;
  interviewerId: string;
  feedback: string | null;
  rating: number | null;
  questions: unknown[];
  answers: unknown[];
  techDna: unknown | null;
  status: string;
  cheatingWarnings: number;
  confidenceScore: number | null;
  bodyLanguageScore: number | null;
  communicationScore: number | null;
  technicalScore: number | null;
  overallRecommendation: string | null;
  createdAt: string;
  interviewLink: string;
  publicToken: string;
  notes: string;
  interviewType: string;
}

export interface FullDB {
  jobs: Job[];
  candidates: Candidate[];
  applications: Application[];
  interviews: Interview[];
}

export interface DB {
  jobs: Record<string, JobRecord>;
}

// ─── DB Path ─────────────────────────────────────────────────

const DB_PATH = path.resolve(process.cwd(), "data", "db.json");

const EMPTY_FULL_DB: FullDB = {
  jobs: [],
  candidates: [],
  applications: [],
  interviews: [],
};

// ─── readDatabase / writeDatabase (backward-compat exports) ──
// These are used by the existing API routes unchanged.

export async function readDatabase(): Promise<FullDB> {
  try {
    if (!fs.existsSync(path.dirname(DB_PATH))) {
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    }
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(EMPTY_FULL_DB, null, 2), "utf-8");
      return { ...EMPTY_FULL_DB };
    }
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<FullDB>;
    // Ensure all keys exist even if db.json is old format
    return {
      jobs: parsed.jobs ?? [],
      candidates: parsed.candidates ?? [],
      applications: parsed.applications ?? [],
      interviews: parsed.interviews ?? [],
    };
  } catch {
    return { ...EMPTY_FULL_DB };
  }
}

export async function writeDatabase(db: FullDB): Promise<void> {
  if (!fs.existsSync(path.dirname(DB_PATH))) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

// ─── Internal sync helpers (used by new candidate pipeline) ──

function readDBSync(): FullDB {
  try {
    if (!fs.existsSync(DB_PATH)) return { ...EMPTY_FULL_DB };
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<FullDB>;
    return {
      jobs: parsed.jobs ?? [],
      candidates: parsed.candidates ?? [],
      applications: parsed.applications ?? [],
      interviews: parsed.interviews ?? [],
    };
  } catch {
    return { ...EMPTY_FULL_DB };
  }
}

function writeDBSync(db: FullDB): void {
  if (!fs.existsSync(path.dirname(DB_PATH))) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

// ─── Job Operations ──────────────────────────────────────────

// ─── Job Operations (new pipeline) ───────────────────────────

export function createJob(
  title: string,
  description: string,
  questions: Omit<InterviewQuestion, "id">[]
): JobRecord {
  const db = readDBSync();
  const jobId = uuidv4();
  const job: JobRecord = {
    jobId,
    title,
    description,
    questions: questions.map((q) => ({ ...q, id: uuidv4() })),
    createdAt: new Date().toISOString(),
    candidates: [],
  };
  // Store in _jobRecords namespace to avoid collision with jobs[]
  const full = db as FullDB & { _jobRecords?: Record<string, JobRecord> };
  if (!full._jobRecords) full._jobRecords = {};
  full._jobRecords[jobId] = job;
  writeDBSync(db);
  return job;
}

export function getJob(jobId: string): JobRecord | null {
  const db = readDBSync() as FullDB & { _jobRecords?: Record<string, JobRecord> };
  return db._jobRecords?.[jobId] ?? null;
}

export function getAllJobs(): JobRecord[] {
  const db = readDBSync() as FullDB & { _jobRecords?: Record<string, JobRecord> };
  return Object.values(db._jobRecords ?? {});
}

// ─── Candidate Operations (new pipeline) ─────────────────────

export function registerCandidate(
  jobId: string,
  name: string,
  email: string,
  resumeText: string
): CandidateProfile {
  const db = readDBSync() as FullDB & { _jobRecords?: Record<string, JobRecord> };
  const job = db._jobRecords?.[jobId];
  if (!job) throw new Error(`Job ${jobId} not found`);

  const candidateId = uuidv4();
  const profile: CandidateProfile = {
    candidateId,
    jobId,
    name,
    email,
    resumeText,
    createdAt: new Date().toISOString(),
    status: "onboarding",
  };

  job.candidates.push(profile);
  writeDBSync(db);
  return profile;
}

export function getCandidate(
  jobId: string,
  candidateId: string
): CandidateProfile | null {
  const db = readDBSync() as FullDB & { _jobRecords?: Record<string, JobRecord> };
  const job = db._jobRecords?.[jobId];
  if (!job) return null;
  return job.candidates.find((c) => c.candidateId === candidateId) ?? null;
}

export function patchCandidate(
  jobId: string,
  candidateId: string,
  patch: Partial<CandidateProfile>
): CandidateProfile {
  const db = readDBSync() as FullDB & { _jobRecords?: Record<string, JobRecord> };
  const job = db._jobRecords?.[jobId];
  if (!job) throw new Error(`Job ${jobId} not found`);

  const idx = job.candidates.findIndex((c) => c.candidateId === candidateId);
  if (idx === -1) throw new Error(`Candidate ${candidateId} not found`);

  const existing = job.candidates[idx];
  const merged: CandidateProfile = {
    ...existing,
    ...patch,
    candidateId: existing.candidateId,
    jobId: existing.jobId,
  };

  job.candidates[idx] = merged;
  writeDBSync(db);
  return merged;
}

export function injectAISummary(
  jobId: string,
  candidateId: string,
  summary: AISummary,
  techDNA: TechDNA
): CandidateProfile {
  return patchCandidate(jobId, candidateId, {
    status: "evaluated",
    aiSummary: summary,
    techDNA,
  });
}
