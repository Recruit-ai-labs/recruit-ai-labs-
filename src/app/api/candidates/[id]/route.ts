import { NextResponse } from 'next/server'
import { readDatabase, writeDatabase } from '@/lib/data-store'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: candidateId } = await params
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

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: candidateId } = await params
  const db = await readDatabase()
  const candidateIndex = db.candidates.findIndex(item => item.id === candidateId)

  if (candidateIndex === -1) {
    return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
  }

  // Find related application IDs BEFORE removing them
  const relatedAppIds = db.applications
    .filter(app => app.candidateId === candidateId)
    .map(app => app.id)

  // Remove interviews linked to those applications
  db.interviews = db.interviews.filter(interview =>
    !interview.applicationId || !relatedAppIds.includes(interview.applicationId)
  )

  // Remove applications for this candidate
  db.applications = db.applications.filter(app => app.candidateId !== candidateId)

  db.candidates.splice(candidateIndex, 1)
  await writeDatabase(db)

  return NextResponse.json({ success: true })
}
