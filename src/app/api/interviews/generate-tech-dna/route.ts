import { NextResponse } from 'next/server'
import { readDatabase, writeDatabase } from '@/lib/data-store'

export async function POST(request: Request) {
  const body = await request.json()
  const { interviewId } = body

  if (!interviewId) {
    return NextResponse.json({ error: 'Interview ID is required' }, { status: 400 })
  }

  const db = await readDatabase()
  const interviewIndex = db.interviews.findIndex(interview => interview.id === interviewId)

  if (interviewIndex === -1) {
    return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
  }

  const interview = db.interviews[interviewIndex]
  const answers = Array.isArray(interview.answers) ? interview.answers : []
  const technicalScore = Math.min(100, Math.round((answers.reduce((sum, answer: any) => sum + (answer.score || 75), 0) / Math.max(1, answers.length)) || 70))
  const communicationScore = Math.min(100, Math.round(65 + (answers.length * 3)))
  const confidenceScore = Math.min(100, Math.round(65 + (answers.length * 2)))
  const bodyLanguageScore = Math.min(100, 70 + Math.round(answers.length * 2))
  const averageScore = Math.round((technicalScore + communicationScore + confidenceScore + bodyLanguageScore) / 4)
  const recommendation = averageScore >= 75 ? 'hire' : averageScore >= 55 ? 'consider' : 'reject'

  const candidate = interview.applicationId ? db.candidates.find(c => c.id === (db.applications.find(a => a.id === interview.applicationId)?.candidateId || '')) : null
  const candidatesSkills = candidate?.parsedSkills || []
  const details = candidate?.resumeText || candidate?.name || 'Candidate profile'

  const techDna = {
    technical_score: technicalScore,
    communication_score: communicationScore,
    confidence_score: confidenceScore,
    body_language_score: bodyLanguageScore,
    strengths: candidatesSkills.length > 0 ? candidatesSkills.slice(0, 4) : ['Problem solving', 'Adaptability'],
    weaknesses: ['Needs more domain exposure', 'Should refine communication examples'],
    key_skills: candidatesSkills.length > 0 ? candidatesSkills.slice(0, 6) : ['Collaboration', 'Attention to detail'],
    experience_level: candidate?.parsedExperience?.length ? `${candidate.parsedExperience.length}+ years` : 'Early career',
    cultural_fit: 'Strong',
    overall_recommendation: recommendation,
    detailed_feedback: `AI summary generated from candidate data and responses: ${details.substring(0, 120)}...`,
  }

  const updatedInterview = {
    ...interview,
    techDna,
    technicalScore,
    communicationScore,
    confidenceScore,
    bodyLanguageScore,
    overallRecommendation: recommendation,
    status: 'completed',
  }

  if (candidate) {
    const summary = `AI summary: ${candidate.name} is strong in ${techDna.key_skills.join(', ')}, has ${techDna.experience_level} experience, and shows ${techDna.cultural_fit} cultural fit.`
    const candidateIndex = db.candidates.findIndex(c => c.id === candidate.id)
    if (candidateIndex !== -1) {
      db.candidates[candidateIndex] = {
        ...candidate,
        aiSummary: summary,
      }
    }
  }

  db.interviews[interviewIndex] = updatedInterview
  await writeDatabase(db)

  return NextResponse.json({ interview: updatedInterview, techDna })
}
