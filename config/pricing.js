// TODO_PRICING: Founder approval is required before replacing any placeholder below.
export const pricingPlans = [
  {
    id: 'recruit-pro',
    name: 'Recruit Pro',
    badge: 'CONTACT US',
    price: 'Custom pricing', // TODO_PRICING
    cadence: '',
    description: 'Discuss the hiring workflow and usage level that fits your team.', // TODO_PRICING
    features: [
      'AI interview capacity based on agreed usage', // TODO_PRICING
      'Resume intelligence engine',
      'Match scoring and shortlisting',
      'Candidate discovery',
      'Interview scheduling',
      'Funnel analytics',
    ],
    className: 'pro',
    cta: 'Request pricing',
    ctaHref: '/contact',
  },
  {
    id: 'single-role',
    name: 'Single-role engagement',
    badge: '',
    price: 'Contact us', // TODO_PRICING
    cadence: '',
    description: 'Tell us about one role and we will confirm scope, capacity and pricing.', // TODO_PRICING
    features: [
      'Screening workflow', // TODO_PRICING
      'Interview scope confirmed before work begins', // TODO_PRICING
      'Reviewable shortlist',
      'Timeline agreed for the role', // TODO_PRICING
    ],
    className: 'oneOff',
    cta: 'Get a quote',
    ctaHref: '/contact',
  },
];
