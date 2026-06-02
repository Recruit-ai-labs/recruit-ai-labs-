import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase-server'
import { generateJobDescription } from '@/lib/jd-generator'
import { trackEvent, RecruitmentEvents } from '@/lib/analytics'

export async function GET(request: Request) {
  try {
    const { userId, orgId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    
    // Use orgId if available, otherwise look up user's org via users table
    const contextId = orgId || await (async () => {
      const { data: user } = await (supabase as any)
        .from('users')
        .select('org_id')
        .eq('id', userId)
        .single()
      return user?.org_id || userId
    })()
    
    let query = (supabase as any)
      .from('jobs')
      .select('*')
      .eq('org_id', contextId)
      .order('created_at', { ascending: false })
    
    if (status) {
      query = query.eq('status', status)
    }
    
    const { data, error } = await query
    
    if (error) {
      throw error
    }
    
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { userId, orgId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const supabase = createServerClient()
    
    // Use orgId if available, otherwise look up user's org via users table
    let contextId: string

    if (orgId) {
      contextId = orgId
    } else {
      // Look up the user's org_id from the users table
      const { data: existingUser } = await (supabase as any)
        .from('users')
        .select('org_id')
        .eq('id', userId)
        .single()

      if (existingUser) {
        contextId = existingUser.org_id
      } else {
        // Create a new organization (let PostgreSQL auto-generate the UUID)
        const { data: newOrg, error: orgError } = await (supabase as any)
          .from('organizations')
          .insert({
            name: 'My Organization',
            plan: 'free',
            seats: 1,
          })
          .select()
          .single()

        if (orgError) {
          console.error('Failed to create organization:', orgError)
          throw new Error('Failed to create organization')
        }

        contextId = newOrg.id

        // Create a user record linking Clerk user ID to the new org
        const { error: userError } = await (supabase as any)
          .from('users')
          .insert({
            id: userId,
            email: '', // Will be updated later
            role: 'admin',
            org_id: contextId,
          })

        if (userError) {
          console.error('Failed to create user record:', userError)
          // Don't throw here - job creation is more important
        }
      }
    }
    
    const body = await request.json()
    const { title, description, requirements, location, salaryMin, salaryMax, status, useAI } = body
    
    console.log('Creating job:', { title, location, status })
    
    let finalDescription = description
    let finalRequirements = requirements
    
    // Generate JD with AI if requested
    if (useAI) {
      finalDescription = await generateJobDescription(contextId, {
        role: title,
        seniority: body.seniority || 'mid',
        skills: body.skills || [],
        location,
      })
      
      // Extract requirements from AI-generated description
      const { generateJobRequirements } = await import('@/lib/jd-generator')
      const aiRequirements = await generateJobRequirements(contextId, title, body.seniority || 'mid')
      finalRequirements = aiRequirements.join('\n')
    }
    
    const { data, error } = await (supabase as any)
      .from('jobs')
      .insert({
        org_id: contextId,
        title,
        description: finalDescription,
        requirements: finalRequirements,
        location,
        salary_min: salaryMin,
        salary_max: salaryMax,
        status: status || 'draft',
      })
      .select()
      .single()
    
    if (error) {
      console.error('Supabase error:', error)
      throw error
    }
    
    console.log('Job created successfully:', data.id)
    
    // Track event
    trackEvent(RecruitmentEvents.JOB_POSTED, {
      jobId: data.id,
      title,
    })
    
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Job creation failed:', error)
    return NextResponse.json({ error: error.message || 'Failed to create job' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
