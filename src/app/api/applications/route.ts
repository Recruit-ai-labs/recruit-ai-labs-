import { NextResponse } from 'next/server'
import { readDatabase } from '@/lib/data-store'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const jobId = url.searchParams.get('jobId')
  const stage = url.searchParams.get('stage')

  const db = await readDatabase()
  let applications = db.applications

  if (jobId) {
    applications = applications.filter(app => app.jobId === jobId)
  }
  if (stage) {
    applications = applications.filter(app => app.stage === stage)
  }

  const result = applications.map(app => ({
    ...app,
    candidates: db.candidates.find(candidate => candidate.id === app.candidateId) || null,
    jobs: db.jobs.find(job => job.id === app.jobId) || null,
  }))

  return NextResponse.json({ applications: result })
}
