import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(request: Request) {
  try {
    const { userId, orgId } = await auth()
    
    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerClient()
    
    // Get query parameters for filtering
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')
    const statuses = statusFilter ? statusFilter.split(',') : []

    // Fetch applications with job and candidate info
    let query = supabase
      .from('applications')
      .select(`
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
      `)
      .eq('jobs.org_id', orgId)

    // Filter by status if provided
    if (statuses.length > 0) {
      query = query.in('stage', statuses)
    }

    const { data: applications, error } = await query as any

    if (error) {
      console.error('Error fetching applications:', error)
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 })
    }

    return NextResponse.json({
      applications: applications || [],
      total: applications?.length || 0
    })
  } catch (error: any) {
    console.error('Applications GET error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch applications' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
