import { NextResponse } from 'next/server'
import { readDatabase, writeDatabase } from '@/lib/data-store'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const interviewId = params.id
  const db = await readDatabase()
  const interview = db.interviews.find(item => item.id === interviewId)

  if (!interview) {
    return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
  }

  const application = interview.applicationId ? db.applications.find(app => app.id === interview.applicationId) : null
  const candidate = application ? db.candidates.find(c => c.id === application.candidateId) : null
  const job = application ? db.jobs.find(j => j.id === application.jobId) : db.jobs.find(j => j.id === interview.jobId)

  return NextResponse.json({
    interview: {
      ...interview,
      applications: {
        candidates: candidate,
        jobs: job,
      },
    },
  })
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const interviewId = params.id
  const body = await request.json()
  const db = await readDatabase()
  const interviewIndex = db.interviews.findIndex(item => item.id === interviewId)

  if (interviewIndex === -1) {
    return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
  }

  const interview = db.interviews[interviewIndex]
  const updated = { ...interview, ...body }

  db.interviews[interviewIndex] = updated
  await writeDatabase(db)

  return NextResponse.json({ interview: updated })
}
