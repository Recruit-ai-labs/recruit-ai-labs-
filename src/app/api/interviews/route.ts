import { NextResponse } from 'next/server'
import { readDatabase, writeDatabase } from '@/lib/data-store'
import { generateId } from '@/lib/utils'

export async function GET() {
  try {
    const db = await readDatabase()
    const upcoming = db.interviews.filter(i => ['scheduled', 'in_progress'].includes(i.status))
    const past = db.interviews.filter(i => ['completed', 'cancelled', 'redlisted'].includes(i.status))

    const normalized = (items: typeof db.interviews) => items.map(interview => {
      const application = db.applications.find(app => app.id === interview.applicationId) || null
      return {
        ...interview,
        applications: application ? {
          ...application,
          candidates: db.candidates.find(candidate => candidate.id === application.candidateId) || null,
          jobs: db.jobs.find(job => job.id === application.jobId) || null,
        } : null,
      }
    })

    return NextResponse.json({ upcoming: normalized(upcoming), past: normalized(past) })
  } catch (error) {
    console.error('Error fetching interviews:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { applicationId, jobId, scheduledAt, interviewerId = '', interviewType = 'mixed', generateQuestions = true, notes = '' } = body

    if (!scheduledAt) {
      return NextResponse.json({ error: 'Interview date is required' }, { status: 400 })
    }

    const db = await readDatabase()
    let actualApplicationId = applicationId
    let resolvedJobId = jobId

    if (!actualApplicationId && resolvedJobId) {
      const application = {
        id: generateId(),
        jobId: resolvedJobId,
        candidateId: '',
        stage: 'new',
        aiMatchScore: null,
        source: 'direct',
        appliedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
      }
      db.applications.push(application)
      actualApplicationId = application.id
    }

    // If we have an applicationId but no jobId, resolve jobId from application
    if (!resolvedJobId && actualApplicationId) {
      const app = db.applications.find(a => a.id === actualApplicationId)
      if (app) resolvedJobId = app.jobId
    }

    const token = generateId()
    const interview = {
      id: generateId(),
      applicationId: actualApplicationId || null,
      jobId: resolvedJobId || null,
      scheduledAt,
      calendarEventId: null,
      videoLink: null,
      interviewerId,
      feedback: null,
      rating: null,
      questions: generateQuestions ? getDefaultQuestions(interviewType) : [],
      answers: [],
      techDna: null,
      status: 'scheduled',
      cheatingWarnings: 0,
      confidenceScore: null,
      bodyLanguageScore: null,
      communicationScore: null,
      technicalScore: null,
      overallRecommendation: null,
      createdAt: new Date().toISOString(),
      interviewLink: `/interview/${token}`,
      publicToken: token,
      notes,
      interviewType,
    }

    db.interviews.push(interview)
    await writeDatabase(db)

    return NextResponse.json({ interviewLink: interview.interviewLink, interview })
  } catch (error) {
    console.error('Error creating interview:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function getDefaultQuestions(type: string) {
  const defaultQuestions = [
    {
      question: 'Tell us about a recent technical challenge you solved.',
      type: 'technical',
      difficulty: 'medium',
      expectedAnswer: 'Explain the problem, your approach, the technologies used, and the outcome.',
      evaluationCriteria: ['clarity', 'technical depth', 'impact'],
    },
    {
      question: 'Describe a time you worked effectively in a team.',
      type: 'behavioral',
      difficulty: 'easy',
      expectedAnswer: 'Share collaboration, communication, and result-oriented behavior.',
      evaluationCriteria: ['teamwork', 'communication', 'ownership'],
    },
    {
      question: 'How do you ensure your code is maintainable and reliable?',
      type: 'technical',
      difficulty: 'medium',
      expectedAnswer: 'Discuss testing, best practices, reviews, and documentation.',
      evaluationCriteria: ['quality', 'process', 'tooling'],
    },
  ]

  if (type === 'behavioral') {
    return [defaultQuestions[1]]
  }
  if (type === 'technical') {
    return [defaultQuestions[0], defaultQuestions[2]]
  }
  return defaultQuestions
}
