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
    const jobId = params.id

    // Fetch all interviews for this job with candidate data
    const { data: interviews, error } = await supabase
      .from('interviews')
      .select(`
        *,
        applications (
          candidates (
            name,
            email,
            parsed_skills,
            resume_url
          ),
          jobs (
            title,
            requirements
          )
        )
      `)
      .eq('applications.job_id', jobId)
      .in('status', ['completed'])
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Leaderboard fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
    }

    const interviewsData = interviews as any[]

    // Calculate scores and create leaderboard
    const leaderboard = (interviewsData || [])
      .map((interview: any) => {
        const technicalScore = interview.technical_score || 0
        const communicationScore = interview.communication_score || 0
        const confidenceScore = interview.confidence_score || 0
        const bodyLanguageScore = interview.body_language_score || 0
        
        // Calculate overall score (weighted average)
        const overallScore = Math.round(
          technicalScore * 0.4 +
          communicationScore * 0.25 +
          confidenceScore * 0.2 +
          bodyLanguageScore * 0.15
        )

        return {
          interviewId: interview.id,
          candidateName: interview.applications?.candidates?.name || 'Unknown',
          candidateEmail: interview.applications?.candidates?.email || 'Unknown',
          skills: interview.applications?.candidates?.parsed_skills || [],
          overallScore,
          technicalScore,
          communicationScore,
          confidenceScore,
          bodyLanguageScore,
          recommendation: interview.overall_recommendation || 'consider',
          cheatingWarnings: interview.cheating_warnings || 0,
          interviewDate: interview.created_at,
          professionalSummary: interview.professional_summary,
        }
      })
      .sort((a, b) => b.overallScore - a.overallScore)
      .map((item, index) => ({ ...item, rank: index + 1 }))

    return NextResponse.json({
      job: interviewsData?.[0]?.applications?.jobs || null,
      leaderboard,
      totalCandidates: leaderboard.length,
    })
  } catch (error: any) {
    console.error('Leaderboard error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch leaderboard' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
