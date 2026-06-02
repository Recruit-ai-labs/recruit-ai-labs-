import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { processResume, saveCandidateToDatabase } from '@/lib/resume-parser'
import { trackEvent, RecruitmentEvents } from '@/lib/analytics'

export async function POST(request: Request) {
  try {
    const { userId, orgId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const contextId = orgId || userId!
    
    const formData = await request.formData()
    const file = formData.get('file') as File
    const jobId = formData.get('jobId') as string
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    
    // Validate file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only PDF and DOCX are allowed.' }, { status: 400 })
    }
    
    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Process resume
    const result = await processResume(contextId, buffer, file.type)
    
    // Calculate match score if job is provided
    let matchScore: number | undefined
    if (jobId) {
      const { createServerClient } = await import('@/lib/supabase-server')
      const supabase = createServerClient()
      
      const { data: job } = await (supabase as any)
        .from('jobs')
        .select('requirements')
        .eq('id', jobId)
        .single()
      
      if (job) {
        const { calculateMatchScore } = await import('@/lib/resume-parser')
        matchScore = await calculateMatchScore(
          contextId,
          job.requirements,
          `${result.parsedData.skills.join(' ')} ${result.parsedData.summary} ${result.parsedData.experience.map(e => `${e.title} ${e.company}`).join(' ')}`
        )
      }
    }
    
    // Save candidate to database
    const candidate = await saveCandidateToDatabase(
      contextId,
      result.resumeText,
      result.parsedData,
      result.aiSummary,
      result.embedding,
      matchScore
    )
    
    // Track event
    trackEvent(RecruitmentEvents.RESUME_UPLOADED, {
      candidateId: candidate.id,
      jobId,
    })
    
    return NextResponse.json({ success: true, candidate })
  } catch (error: any) {
    console.error('Resume parsing error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process resume' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
