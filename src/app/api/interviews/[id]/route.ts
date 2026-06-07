import { NextResponse } from 'next/server'
import { readDatabase, writeDatabase } from '@/lib/data-store'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: interviewId } = await params
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
  } catch (error) {
    console.error('Error fetching interview:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: interviewId } = await params
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
  } catch (error) {
    console.error('Error updating interview:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: interviewId } = await params
    const db = await readDatabase()
    const interviewIndex = db.interviews.findIndex(item => item.id === interviewId)

    if (interviewIndex === -1) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    }

    db.interviews.splice(interviewIndex, 1)
    await writeDatabase(db)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting interview:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
