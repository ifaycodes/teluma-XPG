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
    priceUsd: '$10',
    priceNgn: '≈ ₦14,000',
    highlighted: false,
    features: [
      '5 AI-drafted proposals/mo',
      '10 Vault documents',
      'Full live discovery engine',
      'Standard PDF document export',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    priceUsd: '$25',
    priceNgn: '≈ ₦35,000',
    highlighted: true,
    features: [
      'UNLIMITED AI-drafted proposals',
      '50 Vault documents (full proposal history)',
      'Real-time priority discovery alerts',
      'Editable Word (.docx) & PDF exports',
    ],
  },
  {
    id: 'enterprise',
    name: 'Agency / Consultant',
    priceUsd: '$80',
    priceNgn: '≈ ₦112,000',
    highlighted: false,
    features: [
      'UNLIMITED AI-drafted proposals',
      'UNLIMITED Vault documents',
      'Multi-organization profiles (up to 5)',
      'Exportable audit logs & priority support',
    ],
  },
]
