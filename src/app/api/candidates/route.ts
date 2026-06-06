import { NextResponse } from 'next/server'
import { readDatabase, writeDatabase } from '@/lib/data-store'
import { generateId } from '@/lib/utils'

export async function GET() {
  const db = await readDatabase()
  return NextResponse.json(db.candidates)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { name, email, phone, linkedinUrl, githubUrl, resumeText, parsedSkills = [], parsedExperience = [], parsedEducation = [], aiSummary = null, aiMatchScore = null } = body

  if (!name || !email) {
    return NextResponse.json({ error: 'Missing required candidate fields' }, { status: 400 })
  }

  const db = await readDatabase()
  const candidate = {
    id: generateId(),
    orgId: 'default',
    name,
    email,
    phone: phone || null,
    linkedinUrl: linkedinUrl || null,
    githubUrl: githubUrl || null,
    resumeUrl: null,
    resumeText: resumeText || null,
    parsedSkills: Array.isArray(parsedSkills) ? parsedSkills : [],
    parsedExperience: Array.isArray(parsedExperience) ? parsedExperience : [],
    parsedEducation: Array.isArray(parsedEducation) ? parsedEducation : [],
    aiSummary: aiSummary || null,
    aiMatchScore: typeof aiMatchScore === 'number' ? aiMatchScore : null,
    embedding: null,
    createdAt: new Date().toISOString(),
  }

  db.candidates.push(candidate)
  await writeDatabase(db)
  return NextResponse.json(candidate)
}
