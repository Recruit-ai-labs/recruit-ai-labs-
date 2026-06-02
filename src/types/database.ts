import { z } from "zod"

// Database Types
export interface Organization {
  id: string
  name: string
  stripeCustomerId: string | null
  plan: "free" | "pro" | "enterprise"
  seats: number
  nimCreditsUsed: number
  createdAt: string
}

export interface User {
  id: string
  email: string
  role: "admin" | "recruiter" | "hiring_manager" | "candidate"
  orgId: string
  createdAt: string
}

export interface Job {
  id: string
  orgId: string
  title: string
  description: string
  requirements: string
  location: string
  salaryMin: number | null
  salaryMax: number | null
  status: "draft" | "active" | "closed" | "paused"
  embedding: number[] | null
  adzunaId: string | null
  jsearchId: string | null
  postedAt: string | null
  createdAt: string
}

export interface Candidate {
  id: string
  orgId: string
  name: string
  email: string
  phone: string | null
  linkedinUrl: string | null
  githubUrl: string | null
  resumeUrl: string | null
  resumeText: string | null
  parsedSkills: string[]
  parsedExperience: Experience[]
  parsedEducation: Education[]
  aiSummary: string | null
  aiMatchScore: number | null
  embedding: number[] | null
  createdAt: string
}

export interface Experience {
  company: string
  title: string
  dates: string
  description: string
}

export interface Education {
  school: string
  degree: string
  dates: string
}

export interface Application {
  id: string
  jobId: string
  candidateId: string
  stage: "new" | "screening" | "interview" | "offer" | "hired" | "rejected"
  aiMatchScore: number | null
  source: "direct" | "job_board" | "sourcing" | "referral"
  appliedAt: string
  lastActivityAt: string
}

export interface NIMLog {
  id: string
  orgId: string
  model: string
  endpoint: string
  tokensInput: number
  tokensOutput: number
  latencyMs: number
  costUsd: number
  createdAt: string
}

export interface Interview {
  id: string
  applicationId: string
  scheduledAt: string
  calendarEventId: string | null
  videoLink: string | null
  interviewerId: string
  feedback: string | null
  rating: number | null
  questions: InterviewQuestion[]
  answers: InterviewAnswer[]
  techDna: TechDNA | null
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'redlisted'
  cheatingWarnings: number
  confidenceScore: number | null
  bodyLanguageScore: number | null
  communicationScore: number | null
  technicalScore: number | null
  overallRecommendation: 'hire' | 'consider' | 'reject' | null
  createdAt: string
}

export interface InterviewQuestion {
  question: string
  type: 'technical' | 'behavioral'
  difficulty: 'easy' | 'medium' | 'hard'
  expectedAnswer: string
  evaluationCriteria: string[]
}

export interface InterviewAnswer {
  question: string
  answer: string
  score: number
  strengths: string[]
  weaknesses: string[]
  feedback: string
  recommendation: 'hire' | 'consider' | 'reject'
}

export interface TechDNA {
  technical_score: number
  communication_score: number
  confidence_score: number
  body_language_score: number
  strengths: string[]
  weaknesses: string[]
  key_skills: string[]
  experience_level: string
  cultural_fit: string
  overall_recommendation: 'hire' | 'consider' | 'reject'
  detailed_feedback: string
}

export interface CheatingEvent {
  id: string
  interviewId: string
  eventType: 'tab_switch' | 'face_missing' | 'multiple_faces' | 'phone_detected' | 'no_speaking'
  timestamp: string
  screenshotUrl: string | null
  warningIssued: boolean
}

export interface Activity {
  id: string
  orgId: string
  actorId: string
  action: string
  entityType: string
  entityId: string
  metadata: Record<string, any> | null
  createdAt: string
}

// Zod Validation Schemas
export const candidateSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  phone: z.string().optional(),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  githubUrl: z.string().url().optional().or(z.literal("")),
  resumeText: z.string().optional(),
  parsedSkills: z.array(z.string()),
  parsedExperience: z.array(z.object({
    company: z.string(),
    title: z.string(),
    dates: z.string(),
    description: z.string(),
  })),
  parsedEducation: z.array(z.object({
    school: z.string(),
    degree: z.string(),
    dates: z.string(),
  })),
  aiSummary: z.string().optional(),
  aiMatchScore: z.number().min(0).max(100).optional(),
})

export const jobSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(10),
  requirements: z.string().min(10),
  location: z.string().min(1),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  status: z.enum(["draft", "active", "closed", "paused"]),
})

export const applicationSchema = z.object({
  jobId: z.string(),
  candidateId: z.string(),
  stage: z.enum(["new", "screening", "interview", "offer", "hired", "rejected"]),
  source: z.enum(["direct", "job_board", "sourcing", "referral"]),
})

export const interviewSchema = z.object({
  applicationId: z.string(),
  scheduledAt: z.string(),
  interviewerId: z.string(),
  interviewType: z.enum(['technical', 'behavioral', 'mixed']).default('mixed'),
  generateQuestions: z.boolean().default(true),
  notes: z.string().optional(),
  feedback: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
})

export type CandidateInput = z.infer<typeof candidateSchema>
export type JobInput = z.infer<typeof jobSchema>
export type ApplicationInput = z.infer<typeof applicationSchema>
export type InterviewInput = z.infer<typeof interviewSchema>
