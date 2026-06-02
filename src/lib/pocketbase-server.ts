import PocketBase from 'pocketbase'
import type { RecordModel } from 'pocketbase'

// PocketBase client for server-side operations
const pocketbaseUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090'
const pocketbaseAdminEmail = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@example.com'
const pocketbaseAdminPassword = process.env.POCKETBASE_ADMIN_PASSWORD || 'admin123'

let pbInstance: PocketBase | null = null

export function createServerClient(): PocketBase {
  if (pbInstance) {
    return pbInstance
  }

  const pb = new PocketBase(pocketbaseUrl)
  
  pbInstance = pb
  return pb
}

export async function getAdminClient(): Promise<PocketBase> {
  const pb = new PocketBase(pocketbaseUrl)
  
  try {
    await pb.admins.authWithPassword(pocketbaseAdminEmail, pocketbaseAdminPassword)
  } catch (error) {
    console.error('Failed to authenticate with PocketBase:', error)
    throw error
  }

  return pb
}

// TypeScript types for all collections
export type Organization = RecordModel & {
  name: string
  stripe_customer_id?: string
  plan: 'free' | 'pro' | 'enterprise'
  seats: number
  nim_credits_used: number
}

export type User = RecordModel & {
  email: string
  role: 'admin' | 'recruiter' | 'hiring_manager' | 'candidate'
  org_id: string
  clerk_id: string
}

export type Job = RecordModel & {
  org_id: string
  title: string
  description: string
  requirements: string
  location: string
  salary_min?: number
  salary_max?: number
  status: 'draft' | 'active' | 'closed' | 'paused'
  embedding?: number[]
  adzuna_id?: string
  jsearch_id?: string
  posted_at?: string
}

export type Candidate = RecordModel & {
  org_id: string
  name: string
  email: string
  phone?: string
  linkedin_url?: string
  github_url?: string
  resume?: string // file ID
  resume_text?: string
  parsed_skills: string[]
  parsed_experience: any[]
  parsed_education: any[]
  ai_summary?: string
  ai_match_score?: number
  embedding?: number[]
}

export type Application = RecordModel & {
  job_id: string
  candidate_id: string
  stage: 'new' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected'
  ai_match_score?: number
  source: 'direct' | 'job_board' | 'sourcing' | 'referral'
  applied_at: string
  last_activity_at: string
}

export type Interview = RecordModel & {
  application_id: string
  scheduled_at: string
  calendar_event_id?: string
  video_link?: string
  interviewer_id: string
  feedback?: string
  rating?: number
  questions: any[]
  answers: any[]
  tech_dna?: any
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'redlisted'
  cheating_warnings: number
  confidence_score?: number
  body_language_score?: number
  communication_score?: number
  technical_score?: number
  overall_recommendation?: 'hire' | 'consider' | 'reject'
  public_token?: string
}

export type CheatingEvent = RecordModel & {
  interview_id: string
  event_type: 'tab_switch' | 'face_missing' | 'multiple_faces' | 'phone_detected' | 'no_speaking'
  timestamp: string
  screenshot?: string // file ID
  warning_issued: boolean
}

export type NIMLog = RecordModel & {
  org_id: string
  model: string
  endpoint: string
  tokens_input: number
  tokens_output: number
  latency_ms: number
  cost_usd: number
}

export type Activity = RecordModel & {
  org_id: string
  actor_id: string
  action: string
  entity_type: string
  entity_id: string
  metadata?: any
}

export type Subscription = RecordModel & {
  org_id: string
  stripe_subscription_id?: string
  status: string
  current_period_end?: string
}

// Helper function to get file URL
export function getFileUrl(record: RecordModel, fieldName: string, fileName?: string): string {
  if (!record[fieldName]) return ''
  
  const thumb = '100x100' // thumbnail size
  return pbInstance?.files.getUrl(record, record[fieldName], { thumb }) || ''
}

// Helper function to get full file URL
export function getFullFileUrl(record: RecordModel, fieldName: string): string {
  if (!record[fieldName]) return ''
  return `${pocketbaseUrl}/api/files/${record.collectionId}/${record.id}/${record[fieldName]}`
}
