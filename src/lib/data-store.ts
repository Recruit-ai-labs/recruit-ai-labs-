import fs from 'fs/promises'
import path from 'path'
import { Candidate, Interview, Job, Application } from '@/types/database'

const dataDir = path.join(process.cwd(), 'data')
const dbPath = path.join(dataDir, 'db.json')

export interface Database {
  jobs: Job[]
  candidates: Candidate[]
  applications: Application[]
  interviews: Interview[]
}

const defaultDatabase: Database = {
  jobs: [],
  candidates: [],
  applications: [],
  interviews: [],
}

export async function readDatabase(): Promise<Database> {
  try {
    await fs.mkdir(dataDir, { recursive: true })
    const raw = await fs.readFile(dbPath, 'utf-8')
    return JSON.parse(raw) as Database
  } catch (error) {
    await fs.writeFile(dbPath, JSON.stringify(defaultDatabase, null, 2), 'utf-8')
    return { ...defaultDatabase }
  }
}

export async function writeDatabase(database: Database): Promise<void> {
  await fs.mkdir(dataDir, { recursive: true })
  await fs.writeFile(dbPath, JSON.stringify(database, null, 2), 'utf-8')
}

export async function getJob(jobId: string) {
  const db = await readDatabase()
  return db.jobs.find(job => job.id === jobId) || null
}

export async function getCandidate(candidateId: string) {
  const db = await readDatabase()
  return db.candidates.find(candidate => candidate.id === candidateId) || null
}

export async function getApplication(applicationId: string) {
  const db = await readDatabase()
  return db.applications.find(application => application.id === applicationId) || null
}

export async function getInterview(interviewId: string) {
  const db = await readDatabase()
  return db.interviews.find(interview => interview.id === interviewId) || null
}
