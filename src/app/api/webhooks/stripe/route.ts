import { NextResponse } from 'next/server'
import { handleWebhookEvent } from '@/lib/stripe'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')
  
  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }
  
  try {
    const event = await handleWebhookEvent(body, signature)
    
    const supabase = createServerClient()
    
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any
        const customerId = session.customer
        const subscriptionId = session.subscription
        
        // Update organization with subscription
        await (supabase as any)
          .from('organizations')
          .update({ stripe_customer_id: customerId })
          .eq('stripe_customer_id', customerId)
        
        // Create subscription record
        await (supabase as any)
          .from('subscriptions')
          .insert({
            org_id: session.metadata?.orgId,
            stripe_subscription_id: subscriptionId,
            status: 'active',
          })
        
        break
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object as any
        
        await (supabase as any)
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id)
        
        break
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any
        
        await (supabase as any)
          .from('subscriptions')
          .update({ status: 'canceled' })
          .eq('stripe_subscription_id', subscription.id)
        
        break
      }
    }
    
    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Stripe webhook error:', error)
    return NextResponse.json(
      { error: `Webhook error: ${error.message}` },
      { status: 400 }
    )
  }
}

export const runtime = 'nodejs'
