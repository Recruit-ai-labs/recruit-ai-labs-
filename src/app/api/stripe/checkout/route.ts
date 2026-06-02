import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase-server'
import { createCheckoutSession } from '@/lib/stripe'
import { PLANS } from '@/config/plans'

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { planId, customerId } = await request.json()

    if (!planId || !customerId) {
      return NextResponse.json(
        { error: 'Missing planId or customerId' },
        { status: 400 }
      )
    }

    const plan = PLANS[planId]
    
    if (!plan || plan.id === 'free') {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      )
    }

    if (!plan.priceId) {
      return NextResponse.json(
        { error: 'Plan not configured. Please contact support.' },
        { status: 500 }
      )
    }

    // Get user's organization
    const supabase = createServerClient()
    const { data: org } = await (supabase as any)
      .from('organizations')
      .select('id, name')
      .eq('owner_id', userId)
      .single()

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Create Stripe checkout session
    const session = await createCheckoutSession({
      customerId,
      priceId: plan.priceId,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=true`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?canceled=true`,
      metadata: {
        orgId: org.id,
        planId: plan.id,
        userId,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
