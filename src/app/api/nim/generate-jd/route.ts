import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { generateJobDescription } from '@/lib/jd-generator'

export async function POST(request: Request) {
  try {
    const { userId, orgId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Use orgId if available, otherwise use userId as fallback
    const contextId = orgId || userId!
    
    const body = await request.json()
    const { role, seniority, skills, location } = body
    
    if (!role) {
      return NextResponse.json({ error: 'Role is required' }, { status: 400 })
    }
    
    const description = await generateJobDescription(contextId, {
      role,
      seniority: seniority || 'mid',
      skills: skills || [],
      location,
    })
    
    const { generateJobRequirements } = await import('@/lib/jd-generator')
    const requirements = await generateJobRequirements(contextId, role, seniority || 'mid')
    
    return NextResponse.json({
      description,
      requirements: requirements.join('\n'),
    })
  } catch (error: any) {
    console.error('JD generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate job description' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
