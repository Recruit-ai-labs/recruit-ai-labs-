import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil' as any,
})

export async function createCheckoutSession(params: {
  customerId: string
  priceId: string
  successUrl: string
  cancelUrl: string
  metadata?: Record<string, string>
}) {
  const session = await stripe.checkout.sessions.create({
    customer: params.customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: params.priceId,
        quantity: 1,
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: params.metadata,
  })
  
  return session
}

export async function createCustomerPortalSession(customerId: string, returnUrl: string) {
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
  
  return portalSession
}

export async function handleWebhookEvent(payload: string, signature: string) {
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!
  
  const event = stripe.webhooks.constructEvent(payload, signature, endpointSecret)
  
  return event
}

export async function getCustomerSubscription(customerId: string) {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 1,
  })
  
  return subscriptions.data[0] || null
}

export async function cancelSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.cancel(subscriptionId)
  return subscription
}

export async function updateSubscription(subscriptionId: string, priceId: string) {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscriptionId,
        price: priceId,
      },
    ],
    proration_behavior: 'create_prorations',
  })
  
  return subscription
}
