import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase-server'
import { generateTechDNA } from '@/lib/interview-ai'
import { z } from 'zod'

const generateTechDNASchema = z.object({
  interviewId: z.string(),
})

export async function POST(request: Request) {
  try {
    const { userId, orgId } = await auth()
    
    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate request body
    const validationResult = generateTechDNASchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { interviewId } = validationResult.data
    const supabase = createServerClient()

    // Fetch interview with all answers and candidate info
    const { data: interview, error: fetchError } = await supabase
      .from('interviews')
      .select(`
        *,
        applications (
          id,
          jobs (
            id,
            title
          ),
          candidates (
            id,
            name
          )
        )
      `)
      .eq('id', interviewId)
      .single() as any

    if (fetchError || !interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    }

    const answers = (interview.answers as any[]) || []
    
    if (answers.length === 0) {
      return NextResponse.json(
        { error: 'No answers available to generate Tech DNA' },
        { status: 400 }
      )
    }

    // Generate Tech DNA using AI
    const techDNA = await generateTechDNA(orgId, {
      candidateName: interview.applications?.candidates?.name || 'Unknown',
      role: interview.applications?.jobs?.title || 'Unknown Position',
      answers: answers.map(a => ({
        question: a.question,
        answer: a.answer,
        score: a.score,
        strengths: a.strengths || [],
        weaknesses: a.weaknesses || [],
      })),
      confidenceScore: interview.confidence_score || 50,
      bodyLanguageScore: interview.body_language_score || 50,
      communicationScore: interview.communication_score || 50,
    })

    // Update interview with Tech DNA and scores
    const { data: updatedInterview, error: updateError } = await (supabase as any)
      .from('interviews')
      .update({
        tech_dna: techDNA,
        technical_score: techDNA.technical_score,
        communication_score: techDNA.communication_score,
        confidence_score: techDNA.confidence_score,
        body_language_score: techDNA.body_language_score,
        overall_recommendation: techDNA.overall_recommendation,
      })
      .eq('id', interviewId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating interview with Tech DNA:', updateError)
      return NextResponse.json(
        { error: 'Failed to save Tech DNA' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Tech DNA generated successfully',
      techDNA,
      interview: updatedInterview
    })
  } catch (error: any) {
    console.error('Tech DNA generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate Tech DNA' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
