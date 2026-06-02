import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/pocketbase-server'

export async function GET(request: Request) {
  try {
    const { orgId } = await auth()
    
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const pb = createServerClient()
    
    // Get organization by orgId (assuming orgId is Clerk org ID)
    const orgs = await pb.collection('organizations').getList(1, 1, {
      filter: `clerk_id = "${orgId}"`,
    })
    
    if (orgs.items.length === 0) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }
    
    const org = orgs.items[0]
    
    // Get candidates for this organization
    const { items: candidates } = await pb.collection('candidates').getList(1, 100, {
      filter: `org_id = "${org.id}"`,
      sort: '-created',
    })
    
    return NextResponse.json(candidates)
  } catch (error: any) {
    console.error('Error fetching candidates:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { userId, orgId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const contextId: string = orgId || userId
    
    const body = await request.json()
    const { name, email, phone, linkedin, github, skills, summary } = body
    
    const pb = createServerClient()
    
    // Get organization
    const orgs = await pb.collection('organizations').getList(1, 1, {
      filter: `clerk_id = "${orgId || userId}"`,
    })
    
    if (orgs.items.length === 0) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }
    
    const org = orgs.items[0]
    
    // Create candidate
    const candidate = await pb.collection('candidates').create({
      org_id: org.id,
      name,
      email,
      phone: phone || null,
      linkedin_url: linkedin || null,
      github_url: github || null,
      parsed_skills: skills ? skills.split(',').map((s: string) => s.trim()) : [],
      ai_summary: summary || null,
    })
    
    return NextResponse.json(candidate)
  } catch (error: any) {
    console.error('Error creating candidate:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export const runtime = 'nodejs'
