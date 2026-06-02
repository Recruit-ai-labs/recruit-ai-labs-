import { NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET
  
  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local')
  }
  
  const body = await request.text()
  const headers = request.headers
  
  const wh = new Webhook(WEBHOOK_SECRET)
  
  let evt: any
  
  try {
    evt = wh.verify(body, {
      'svix-id': headers.get('svix-id')!,
      'svix-timestamp': headers.get('svix-timestamp')!,
      'svix-signature': headers.get('svix-signature')!,
    })
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return NextResponse.json({ error: 'Error verifying webhook' }, { status: 400 })
  }
  
  const supabase = createServerClient()
  
  if (evt.type === 'user.created') {
    const user = evt.data
    
    // Create user in database
    await (supabase as any)
      .from('users')
      .insert({
        id: user.id,
        email: user.email_addresses[0]?.email_address,
        role: 'recruiter',
        org_id: user.organization_id || null,
      })
  }
  
  if (evt.type === 'user.deleted') {
    const user = evt.data
    
    await (supabase as any)
      .from('users')
      .delete()
      .eq('id', user.id)
  }
  
  return NextResponse.json({ success: true })
}

export const runtime = 'nodejs'
