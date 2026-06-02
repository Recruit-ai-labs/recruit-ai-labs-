import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase-server'
import BillingPage from './billing-page-client'

export default async function BillingPageServer() {
  const { userId } = await auth()
  
  if (!userId) {
    return null
  }

  const supabase = createServerClient()
  
  // Get organization and subscription data
  const { data: org } = await (supabase as any)
    .from('organizations')
    .select('*, subscriptions(plan_id, status)')
    .eq('owner_id', userId)
    .single()

  const currentPlan = org?.subscriptions?.[0]?.status === 'active' 
    ? org.subscriptions[0].plan_id 
    : 'free'
  
  const stripeCustomerId = org?.stripe_customer_id || null

  // Create customer if doesn't exist
  let customerId = stripeCustomerId
  
  if (!customerId) {
    // You can create a Stripe customer here if needed
    // For now, we'll use a placeholder
    console.log('No Stripe customer ID found for organization')
  }

  return <BillingPage currentPlan={currentPlan} stripeCustomerId={customerId} />
}
