import { NextResponse } from 'next/server'
import { readDatabase } from '@/lib/data-store'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const candidateId = params.id
  const db = await readDatabase()
  const candidate = db.candidates.find(item => item.id === candidateId)

  if (!candidate) {
    return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
  }

  const interviews = db.interviews
    .filter(interview => {
      const application = db.applications.find(app => app.id === interview.applicationId)
      return application?.candidateId === candidateId
    })
    .map(interview => ({
      ...interview,
      applications: {
        candidates: candidate,
        jobs: db.jobs.find(job => job.id === (db.applications.find(app => app.id === interview.applicationId)?.jobId || '')) || null,
      },
    }))

  return NextResponse.json({ candidate, interviews })
}
