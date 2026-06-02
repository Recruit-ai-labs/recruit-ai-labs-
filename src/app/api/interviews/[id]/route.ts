import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { orgId } = await auth()
    
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerClient()
    const interviewId = params.id

    // Fetch complete interview data
    const { data: interview, error } = await supabase
      .from('interviews')
      .select(`
        *,
        applications (
          candidates (
            name,
            email,
            phone,
            linkedin_url,
            github_url,
            resume_url,
            resume_text,
            parsed_skills,
            parsed_experience,
            parsed_education,
            ai_summary
          ),
          jobs (
            title,
            location,
            description,
            requirements
          )
        ),
        cheating_events (
          id,
          event_type,
          timestamp,
          warning_issued
        )
      `)
      .eq('id', interviewId)
      .single()

    if (error || !interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    }

    return NextResponse.json({ interview })
  } catch (error: any) {
    console.error('Interview detail error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch interview' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { orgId } = await auth()
    
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerClient()
    const interviewId = params.id
    const body = await request.json()

    // Update interview
    const { data: interview, error: updateError } = await (supabase as any)
      .from('interviews')
      .update(body)
      .eq('id', interviewId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating interview:', updateError)
      return NextResponse.json({ error: 'Failed to update interview' }, { status: 500 })
    }

    // If cheating event is included, log it
    if (body.cheatingEvent) {
      await supabase
        .from('cheating_events')
        .insert({
          interview_id: interviewId,
          event_type: body.cheatingEvent.eventType,
          screenshot_url: body.cheatingEvent.screenshotUrl || null,
          warning_issued: body.cheatingEvent.warningIssued || false,
        } as any)
    }

    return NextResponse.json({
      message: 'Interview updated successfully',
      interview
    })
  } catch (error: any) {
    console.error('Interview detail PATCH error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update interview' },
      { status: 500 }
    )
  }
}
