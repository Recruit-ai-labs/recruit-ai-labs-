'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Loader2, CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import { PLANS } from '@/config/plans'

interface BillingPageProps {
  currentPlan: string
  stripeCustomerId: string | null
}

export default function BillingPage({ currentPlan, stripeCustomerId }: BillingPageProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const searchParams = useSearchParams()

  // Show success/cancel messages after redirect from Stripe
  useEffect(() => {
    const success = searchParams.get('success')
    const canceled = searchParams.get('canceled')

    if (success) {
      toast.success('Payment successful! Your plan has been upgraded.')
    } else if (canceled) {
      toast.error('Payment was canceled. You can try again anytime.')
    }
  }, [searchParams])

  const handleUpgrade = async (planId: string) => {
    if (!stripeCustomerId) {
      toast.error('Please contact support to set up billing')
      return
    }

    setLoading(planId)
    
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          customerId: stripeCustomerId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create checkout session')
      }

      const { url } = await response.json()
      
      // Redirect to Stripe Checkout
      window.location.href = url
    } catch (error: any) {
      toast.error(error.message || 'Failed to start checkout')
      setLoading(null)
    }
  }

  const plans = Object.values(PLANS).filter(plan => plan.id !== 'free')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing & Plans</h1>
        <p className="text-muted-foreground mt-1">Choose the perfect plan for your team</p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">You are currently on</p>
              <p className="text-2xl font-bold capitalize">{currentPlan} Plan</p>
            </div>
            <Badge variant={currentPlan === 'free' ? 'secondary' : 'default'} className="text-lg px-4 py-1">
              {currentPlan.toUpperCase()}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card key={plan.id} className={`relative ${plan.id === 'pro' ? 'border-primary shadow-lg' : ''}`}>
            {plan.id === 'pro' && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                Most Popular
              </Badge>
            )}
            <CardHeader>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">${plan.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              
              <ul className="space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">NIM Credits</span>
                  <span className="font-semibold">{plan.nimCredits.toLocaleString()}/month</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Max Jobs</span>
                  <span className="font-semibold">{plan.maxJobs === -1 ? 'Unlimited' : plan.maxJobs}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Team Seats</span>
                  <span className="font-semibold">{plan.maxSeats === -1 ? 'Unlimited' : plan.maxSeats}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => handleUpgrade(plan.id)}
                disabled={loading === plan.id || currentPlan === plan.id}
                className="w-full"
                variant={plan.id === 'pro' ? 'default' : 'outline'}
              >
                {loading === plan.id ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Redirecting...
                  </>
                ) : currentPlan === plan.id ? (
                  'Current Plan'
                ) : (
                  `Upgrade to ${plan.name}`
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
