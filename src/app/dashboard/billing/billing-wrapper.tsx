import { auth } from '@clerk/nextjs/server'
import BillingPage from './billing-page-client'

export default async function BillingPageServer() {
  const { userId, orgId } = await auth()
  
  if (!userId) {
    return null
  }

  const currentPlan = 'free'
  const customerId = null

  return <BillingPage currentPlan={currentPlan} stripeCustomerId={customerId} />
}
