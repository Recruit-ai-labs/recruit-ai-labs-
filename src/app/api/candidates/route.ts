import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(request: Request) {
  try {
    const { orgId } = await auth()
    
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const supabase = createServerClient()
    const { data, error } = await (supabase as any)
      .from('candidates')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
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
    
    const contextId: string = orgId || userId!
    
    const body = await request.json()
    const { name, email, phone, linkedin, github, skills, summary } = body
    
    const supabase = createServerClient()
    
    const { data, error } = await (supabase as any)
      .from('candidates')
      .insert({
        org_id: contextId,
        name,
        email,
        phone: phone || null,
        linkedin_url: linkedin || null,
        github_url: github || null,
        parsed_skills: skills ? skills.split(',').map((s: string) => s.trim()) : [],
        ai_summary: summary || null,
      })
      .select()
      .single()
    
    if (error) {
      throw error
    }
    
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export const runtime = 'nodejs'
