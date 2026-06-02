import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/pocketbase-server'
import { processResume } from '@/lib/resume-parser'

export async function POST(request: Request) {
  try {
    const pb = createServerClient()

    const formData = await request.formData()
    const resume = formData.get('resume') as File
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string
    const linkedin = formData.get('linkedin') as string
    const github = formData.get('github') as string
    const interviewId = formData.get('interviewId') as string

    if (!resume || !name || !email || !interviewId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get interview to find org_id and job_id
    const interview = await pb.collection('interviews').getOne(interviewId, {
      expand: 'application_id.job_id,application_id.candidate_id',
    })

    if (!interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    }

    // Navigate the expanded data to get org_id and job_id
    // Note: Adjust based on your actual PocketBase relations
    const orgId = (interview.expand as any)?.application_id?.candidate_id?.org_id
    const jobId = (interview.expand as any)?.application_id?.job_id?.id

    if (!orgId || !jobId) {
      return NextResponse.json({ error: 'Invalid interview data' }, { status: 400 })
    }

    // Convert resume to buffer
    const bytes = await resume.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Process resume using the library function
    const processedData = await processResume(orgId, buffer, resume.type)
    const parsedResume = processedData.parsedData

    // Create candidate with resume file
    const candidateFormData = new FormData()
    candidateFormData.append('org_id', orgId)
    candidateFormData.append('name', parsedResume.name || name)
    candidateFormData.append('email', parsedResume.email || email)
    candidateFormData.append('phone', phone || parsedResume.phone || '')
    candidateFormData.append('linkedin_url', linkedin || '')
    candidateFormData.append('github_url', github || '')
    
    // Append resume file (PocketBase handles file upload via FormData)
    candidateFormData.append('resume', new Blob([buffer]), resume.name)
    
    candidateFormData.append('resume_text', parsedResume.summary || '')
    candidateFormData.append('parsed_skills', JSON.stringify(parsedResume.skills || []))
    candidateFormData.append('parsed_experience', JSON.stringify(parsedResume.experience || []))
    candidateFormData.append('parsed_education', JSON.stringify(parsedResume.education || []))

    const candidate = await pb.collection('candidates').create(candidateFormData)

    // Get the resume file URL
    const resumeUrl = pb.files.getUrl(candidate, candidate.resume)

    // Create application if not already exists
    const existingApps = await pb.collection('applications').getList(1, 1, {
      filter: `job_id = "${jobId}" && candidate_id = "${candidate.id}"`,
    })

    if (existingApps.items.length === 0) {
      await pb.collection('applications').create({
        job_id: jobId,
        candidate_id: candidate.id,
        stage: 'interview',
        source: 'direct',
      })
    }

    return NextResponse.json({
      message: 'Resume uploaded and candidate created successfully',
      candidateId: candidate.id,
      candidate: {
        ...candidate,
        resume_url: resumeUrl,
      },
    })
  } catch (error: any) {
    console.error('Resume upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to upload resume' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
