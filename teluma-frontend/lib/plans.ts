export interface PlanTier {
  id: 'basic' | 'pro' | 'enterprise'
  name: string
  priceNgn: string
  priceUsd: string
  highlighted: boolean
  features: string[]
}

export const PLAN_TIERS: PlanTier[] = [
  {
    id: 'basic',
    name: 'Starter',
    priceNgn: '₦12,000',
    priceUsd: '$10 USD',
    highlighted: false,
    features: [
      '5 AI-drafted proposals/mo',
      'Full live discovery engine',
      'Fit-scoring on all matches',
      '20 core documents (500MB)',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    priceNgn: '₦35,000',
    priceUsd: '$25 USD',
    highlighted: true,
    features: [
      'UNLIMITED AI-drafted proposals',
      'Priority 24/7 discovery alerts',
      'Full proposal history memory',
      '100 core documents (2GB)',
    ],
  },
  {
    id: 'enterprise',
    name: 'Agency / Consultant',
    priceNgn: '₦120,000',
    priceUsd: '$80 USD',
    highlighted: false,
    features: [
      'UNLIMITED AI-drafted proposals',
      'Multi-organization profiles (up to 5)',
      'Exportable audit & compliance logs',
      'Dedicated agent resource allocation',
    ],
  },
]
