import { NextResponse } from 'next/server'
import { readDatabase, writeDatabase } from '@/lib/data-store'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = await readDatabase()
  const jobIndex = db.jobs.findIndex(j => j.id === id)

  if (jobIndex === -1) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  // Find related applications
  const relatedAppIds = db.applications
    .filter(app => app.jobId === id)
    .map(app => app.id)

  // Remove interviews linked to those applications
  db.interviews = db.interviews.filter(interview =>
    !interview.applicationId || !relatedAppIds.includes(interview.applicationId)
  )

  // Remove applications for this job
  db.applications = db.applications.filter(app => app.jobId !== id)

  // Remove the job
  db.jobs.splice(jobIndex, 1)
  await writeDatabase(db)

  return NextResponse.json({ success: true })
}
