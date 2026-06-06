import { NextResponse } from 'next/server'
import { readDatabase, writeDatabase } from '@/lib/data-store'
import { generateId } from '@/lib/utils'

export async function GET() {
  const db = await readDatabase()
  return NextResponse.json(db.jobs)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { title, description, requirements, location, salaryMin, salaryMax, status = 'draft', seniority, skills } = body

  if (!title || !description || !requirements || !location) {
    return NextResponse.json({ error: 'Missing required job fields' }, { status: 400 })
  }

  const db = await readDatabase()
  const job = {
    id: generateId(),
    title,
    description,
    requirements,
    location,
    salaryMin: salaryMin ?? null,
    salaryMax: salaryMax ?? null,
    status,
    seniority: seniority ?? 'mid',
    skills: Array.isArray(skills) ? skills : [],
    embedding: null,
    adzunaId: null,
    jsearchId: null,
    postedAt: null,
    orgId: 'default',
    createdAt: new Date().toISOString(),
  }

  db.jobs.push(job)
  await writeDatabase(db)
  return NextResponse.json(job)
}
