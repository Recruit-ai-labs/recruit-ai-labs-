import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase-server'
import { interviewSchema } from '@/types/database'
import { generateInterviewQuestions } from '@/lib/interview-ai'
import { randomBytes } from 'crypto'

export async function GET(request: Request) {
  try {
    const { userId, orgId } = await auth()
    
    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerClient()
    
    // Fetch interviews with related data
    const { data: interviews, error } = await supabase
      .from('interviews')
      .select(`
        *,
        applications (
          id,
          stage,
          jobs (
            id,
            title,
            location
          ),
          candidates (
            id,
            name,
            email,
            phone
          )
        )
      `)
      .eq('applications.jobs.org_id', orgId)
      .order('scheduled_at', { ascending: false }) as any

    if (error) {
      console.error('Error fetching interviews:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      
      // If it's a column/table not found error, return empty arrays
      if (error.code === '42703' || error.code === '42P01') {
        console.warn('Interviews table or columns not found. Please run migration 003_interview_enhancements.sql')
        return NextResponse.json({
          upcoming: [],
          past: [],
          total: 0
        })
      }
      
      return NextResponse.json({ error: 'Failed to fetch interviews', details: error.message }, { status: 500 })
    }

    // Separate upcoming and past interviews
    const now = new Date().toISOString()
    const interviewsArray = interviews || []
    const upcoming = interviewsArray.filter((i: any) => i.scheduled_at > now && i.status === 'scheduled')
    const past = interviewsArray.filter((i: any) => i.scheduled_at <= now || ['completed', 'cancelled', 'redlisted'].includes(i.status))

    return NextResponse.json({
      upcoming,
      past,
      total: interviews?.length || 0
    })
  } catch (error: any) {
    console.error('Interviews GET error:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch interviews' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { userId, orgId } = await auth()
    
    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate request body
    const validationResult = interviewSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { applicationId, scheduledAt, interviewerId, interviewType, generateQuestions, notes } = validationResult.data

    const supabase = createServerClient()

    // Get application details to extract job and candidate info
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select(`
        *,
        jobs (
          id,
          title,
          requirements
        ),
        candidates (
          id,
          name,
          parsed_skills
        )
      `)
      .eq('id', applicationId)
      .single() as any

    if (appError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Generate AI questions if requested
    let questions: any[] = []
    if (generateQuestions && application.jobs && application.candidates) {
      try {
        questions = await generateInterviewQuestions(orgId, {
          role: application.jobs.title,
          seniority: 'mid', // Can be extracted from job title
          skills: application.candidates.parsed_skills || [],
          questionType: interviewType,
          count: 10
        })
      } catch (error) {
        console.error('Failed to generate questions:', error)
        // Continue even if question generation fails
      }
    }

    // Generate unique interview link
    const interviewToken = randomBytes(16).toString('hex')
    const interviewLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/interview/${interviewToken}`

    // Create interview record
    const { data: interview, error: insertError } = await supabase
      .from('interviews')
      .insert({
        application_id: applicationId,
        scheduled_at: scheduledAt,
        interviewer_id: interviewerId,
        status: 'scheduled',
        questions: questions,
        video_link: notes || null,
        interview_link: interviewLink,
      } as any)
      .select()
      .single()

    if (insertError) {
      console.error('Error creating interview:', insertError)
      return NextResponse.json({ error: 'Failed to create interview' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Interview scheduled successfully',
      interview,
      interviewLink,
      questionsGenerated: questions.length
    }, { status: 201 })
  } catch (error: any) {
    console.error('Interviews POST error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to schedule interview' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
