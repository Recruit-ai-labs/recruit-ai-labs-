import { NextResponse } from 'next/server'
import { generateId } from '@/lib/utils'
import { readDatabase, writeDatabase } from '@/lib/data-store'
import fs from 'fs/promises'
import path from 'path'

const uploadDir = path.join(process.cwd(), 'public', 'uploads')

async function saveFile(file: File) {
  await fs.mkdir(uploadDir, { recursive: true })
  const fileName = `${generateId()}-${file.name}`
  const buffer = Buffer.from(await file.arrayBuffer())
  const pathName = path.join(uploadDir, fileName)
  await fs.writeFile(pathName, buffer)
  return `/uploads/${fileName}`
}

async function parseText(file: File) {
  try {
    const text = await file.text()
    return text
  } catch {
    return ''
  }
}

function extractSkills(text: string) {
  const keywords = ['react', 'node', 'typescript', 'javascript', 'python', 'aws', 'docker', 'kubernetes', 'sql', 'graphql', 'nextjs']
  return Array.from(new Set(keywords.filter(skill => text.toLowerCase().includes(skill))))
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'Resume file is required' }, { status: 400 })
  }

  const resumeUrl = await saveFile(file)
  const resumeText = await parseText(file)
  const parsedSkills = extractSkills(resumeText)
  const parsedExperience = []
  const parsedEducation = []
  const aiSummary = parsedSkills.length
    ? `AI parsed resume and found skills: ${parsedSkills.join(', ')}`
    : 'Resume parsed successfully. No skills were extracted automatically.'

  const candidate = {
    id: generateId(),
    orgId: 'default',
    name: '',
    email: '',
    phone: null,
    linkedinUrl: null,
    githubUrl: null,
    resumeUrl,
    resumeText,
    parsedSkills,
    parsedExperience,
    parsedEducation,
    aiSummary,
    aiMatchScore: null,
    embedding: null,
    createdAt: new Date().toISOString(),
  }

  const db = await readDatabase()
  db.candidates.push(candidate)
  await writeDatabase(db)

  return NextResponse.json({ candidate })
}
