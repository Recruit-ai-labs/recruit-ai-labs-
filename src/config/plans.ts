export interface Plan {
  id: string
  name: string
  description: string
  price: number
  priceId: string
  features: string[]
  nimCredits: number
  maxJobs: number
  maxSeats: number
}

export const PLANS: Record<string, Plan> = {
  free: {
    id: "free",
    name: "Free",
    description: "For individuals and small teams getting started",
    price: 0,
    priceId: process.env.STRIPE_PRICE_ID_FREE || "",
    features: ["5 job postings", "100 NIM credits/month", "Basic AI parsing", "Email support"],
    nimCredits: 100,
    maxJobs: 5,
    maxSeats: 1,
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "For growing teams with advanced AI needs",
    price: 99,
    priceId: process.env.STRIPE_PRICE_ID_PRO || "",
    features: [
      "Unlimited job postings",
      "5,000 NIM credits/month",
      "Advanced AI matching",
      "Semantic search",
      "Priority support",
      "Custom integrations",
    ],
    nimCredits: 5000,
    maxJobs: -1,
    maxSeats: 10,
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "For organizations with custom AI infrastructure",
    price: 499,
    priceId: process.env.STRIPE_PRICE_ID_ENTERPRISE || "",
    features: [
      "Everything in Pro",
      "50,000 NIM credits/month",
      "Self-hosted NIM support",
      "Dedicated account manager",
      "Custom AI models",
      "SSO & SAML",
      "SLA guarantee",
    ],
    nimCredits: 50000,
    maxJobs: -1,
    maxSeats: -1,
  },
}
