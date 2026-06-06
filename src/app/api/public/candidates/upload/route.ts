import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { readDatabase, writeDatabase } from '@/lib/data-store'
import { generateId } from '@/lib/utils'

const uploadDir = path.join(process.cwd(), 'public', 'uploads')

async function saveUploadedFile(file: File, fileName: string) {
  await fs.mkdir(uploadDir, { recursive: true })
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const filePath = path.join(uploadDir, fileName)
  await fs.writeFile(filePath, buffer)
  return `/uploads/${fileName}`
}

async function parseResumeText(file: File) {
  const text = await file.text()
  return text.slice(0, 5000)
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const resume = formData.get('resume') as File | null
  const name = formData.get('name') as string | null
  const email = formData.get('email') as string | null
  const phone = formData.get('phone') as string | null
  const linkedin = formData.get('linkedin') as string | null
  const github = formData.get('github') as string | null
  const interviewId = formData.get('interviewId') as string | null

  if (!resume || !name || !email || !interviewId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const db = await readDatabase()
  const interviewIndex = db.interviews.findIndex(item => item.id === interviewId)

  if (interviewIndex === -1) {
    return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
  }

  const resumeUrl = await saveUploadedFile(resume, `${generateId()}-${resume.name}`)
  const resumeText = await parseResumeText(resume)
  const skillKeywords = ['react', 'node', 'typescript', 'javascript', 'python', 'aws', 'docker', 'sql', 'graphql', 'nextjs']
  const parsedSkills = skillKeywords.filter(skill => resumeText.toLowerCase().includes(skill))
  const candidate = {
    id: generateId(),
    orgId: 'default',
    name,
    email,
    phone: phone || null,
    linkedinUrl: linkedin || null,
    githubUrl: github || null,
    resumeUrl,
    resumeText,
    parsedSkills,
    parsedExperience: [],
    parsedEducation: [],
    aiSummary: `Candidate ${name} applied with resume uploaded and shows skills: ${parsedSkills.join(', ')}`,
    aiMatchScore: null,
    embedding: null,
    createdAt: new Date().toISOString(),
  }

  db.candidates.push(candidate)

  const interview = db.interviews[interviewIndex]
  let applicationId = interview.applicationId

  if (!applicationId) {
    const application = {
      id: generateId(),
      jobId: interview.jobId || '',
      candidateId: candidate.id,
      stage: 'interview',
      aiMatchScore: null,
      source: 'direct',
      appliedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
    }
    db.applications.push(application)
    applicationId = application.id
    db.interviews[interviewIndex] = { ...interview, applicationId }
  } else {
    const applicationIndex = db.applications.findIndex(app => app.id === applicationId)
    if (applicationIndex !== -1) {
      db.applications[applicationIndex] = {
        ...db.applications[applicationIndex],
        candidateId: candidate.id,
        stage: 'interview',
        lastActivityAt: new Date().toISOString(),
      }
    }
  }

  await writeDatabase(db)
  return NextResponse.json({ candidate, interview: db.interviews[interviewIndex] })
}
