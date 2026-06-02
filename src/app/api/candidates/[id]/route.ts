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
    const candidateId = params.id

    // Fetch candidate
    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', candidateId)
      .single()

    if (candidateError || !candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }

    // Fetch all interviews for this candidate
    const { data: interviews, error: interviewsError } = await supabase
      .from('interviews')
      .select(`
        *,
        applications (
          jobs (
            title,
            location
          ),
          candidates (
            name,
            email
          )
        ),
        cheating_events (
          id,
          event_type,
          timestamp,
          warning_issued
        )
      `)
      .eq('applications.candidate_id', candidateId)
      .order('created_at', { ascending: false })

    if (interviewsError) {
      console.error('Interviews fetch error:', interviewsError)
    }

    return NextResponse.json({
      candidate,
      interviews: interviews || [],
    })
  } catch (error: any) {
    console.error('Candidate detail error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch candidate' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
