'use client'
import { useState } from 'react'
import api from '@/lib/api'
import { PLAN_TIERS } from '@/lib/plans'
import { OFFSET_BTN } from '@/lib/theme'

export function PlanPickerModal({ onResolved }: { onResolved: () => void }) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  async function handleFree() {
    setLoadingPlan('free')
    try {
      await api.post('/user/select-free')
      onResolved()
    } catch (err) {
      console.error('Failed to select free plan:', err)
      setLoadingPlan(null)
    }
  }

  async function handlePaid(plan: string) {
    setLoadingPlan(plan)
    try {
      const res = await api.post('/billing/checkout', { plan })
      window.location.href = res.data.checkout_url
    } catch (err) {
      console.error('Failed to start checkout:', err)
      setLoadingPlan(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-[#1C1C1C]/60 z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#FDFAF4] border border-[#1C1C1C]/10 rounded-2xl shadow-[0_8px_32px_rgba(28,28,28,0.25)] p-6 md:p-8 w-full max-w-3xl my-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-black text-[#1C1C1C] mb-2">Pick your plan</h2>
          <p className="text-sm text-[#2C1A0E]/60">Start free, or jump straight into a paid tier — you can change this anytime in Settings.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          {PLAN_TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`rounded-xl p-4 flex flex-col border ${
                tier.highlighted ? 'bg-[#1C1C1C] text-[#FDFAF4] border-[#1C1C1C]' : 'bg-[#F5F0E8] border-[#1C1C1C]/10'
              }`}
            >
              <h4 className="font-bold text-sm mb-1">{tier.name}</h4>
              <div className="mb-1">
                <span className="text-xl font-black">{tier.priceNgn}</span>
                <span className={`text-xs ml-1 ${tier.highlighted ? 'text-[#FDFAF4]/70' : 'text-[#2C1A0E]/50'}`}>/mo</span>
              </div>
              <p className={`text-xs mb-3 ${tier.highlighted ? 'text-[#FDFAF4]/60' : 'text-[#2C1A0E]/40'}`}>{tier.priceUsd}</p>
              <ul className="space-y-1.5 mb-4 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className={`text-xs flex items-start gap-1.5 ${tier.highlighted ? 'text-[#FDFAF4]/80' : 'text-[#2C1A0E]/70'}`}>
                    <span className="material-symbols-outlined text-sm flex-shrink-0">check</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handlePaid(tier.id)}
                disabled={loadingPlan !== null}
                className={`w-full py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 ${
                  tier.highlighted
                    ? `bg-[#A8192E] text-[#FDFAF4] hover:bg-[#8f1526] ${OFFSET_BTN}`
                    : `bg-[#1C1C1C] text-[#FDFAF4] hover:bg-[#1C1C1C]/85 ${OFFSET_BTN}`
                }`}
              >
                {loadingPlan === tier.id ? 'Redirecting...' : 'Choose plan'}
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={handleFree}
          disabled={loadingPlan !== null}
          className="w-full text-center py-2.5 text-sm font-semibold text-[#A8192E] hover:underline disabled:opacity-50"
        >
          {loadingPlan === 'free' ? 'Setting up your account...' : 'Continue with Free Trial'}
        </button>
      </div>
    </div>
  )
}
