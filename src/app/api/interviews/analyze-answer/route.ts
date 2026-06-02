import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { analyzeCandidateAnswer } from '@/lib/interview-ai'
import { z } from 'zod'

const analyzeAnswerSchema = z.object({
  question: z.string(),
  answer: z.string(),
  expectedAnswer: z.string(),
  evaluationCriteria: z.array(z.string()),
})

export async function POST(request: Request) {
  try {
    const { userId, orgId } = await auth()
    
    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate request body
    const validationResult = analyzeAnswerSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { question, answer, expectedAnswer, evaluationCriteria } = validationResult.data

    // Analyze the candidate's answer using AI
    const analysis = await analyzeCandidateAnswer(orgId, {
      question,
      answer,
      expectedAnswer,
      evaluationCriteria,
    })

    return NextResponse.json({
      analysis,
      message: 'Answer analyzed successfully'
    })
  } catch (error: any) {
    console.error('Answer analysis error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to analyze answer' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
