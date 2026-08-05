'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { DashboardData } from '@/lib/types'
import { OFFSET, OFFSET_BTN } from '@/lib/theme'

const PLAN_TIERS = [
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
] as const

export default function SettingsPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [checkoutBanner, setCheckoutBanner] = useState<'success' | 'cancelled' | null>(null)

  useEffect(() => {
    fetchDashboard()

    const params = new URLSearchParams(window.location.search)
    const checkout = params.get('checkout')
    if (checkout === 'success' || checkout === 'cancelled') {
      setCheckoutBanner(checkout)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  async function fetchDashboard() {
    try {
      const res = await api.get('/dashboard/')
      setData(res.data)
    } catch (err) {
      console.error('Failed to fetch account info:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function handleUpgrade(plan: string) {
    setUpgradingPlan(plan)
    try {
      const res = await api.post('/billing/checkout', { plan })
      window.location.href = res.data.checkout_url
    } catch (err) {
      console.error('Failed to start checkout:', err)
      setUpgradingPlan(null)
    }
  }

  async function handleManageBilling() {
    setPortalLoading(true)
    try {
      const res = await api.post('/billing/portal')
      window.location.href = res.data.portal_url
    } catch (err) {
      console.error('Failed to open billing portal:', err)
      setPortalLoading(false)
    }
  }

  const storagePercent = data
    ? Math.round((data.storage.used_bytes / data.storage.limit_bytes) * 100)
    : 0

  return (
    <div className="max-w-4xl mx-auto">

      <p className="text-sm text-[#2C1A0E]/60 mb-6">Your account and organization details</p>

      {checkoutBanner && (
        <div className={`flex items-center gap-3 rounded-xl px-4 py-3 mb-6 ${OFFSET} ${
          checkoutBanner === 'success' ? 'bg-[#1C1C1C] text-[#FDFAF4]' : 'bg-[#FDFAF4] border border-[#1C1C1C]/10 text-[#1C1C1C]'
        }`}>
          <span className="material-symbols-outlined">
            {checkoutBanner === 'success' ? 'check_circle' : 'info'}
          </span>
          <p className="text-sm flex-1">
            {checkoutBanner === 'success'
              ? "Payment received — your plan will update shortly."
              : 'Checkout was cancelled. No changes were made to your plan.'}
          </p>
          <button onClick={() => setCheckoutBanner(null)} className="opacity-60 hover:opacity-100 flex-shrink-0">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-[#A8192E] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data ? (
        <div className={`bg-[#FDFAF4] border border-[#1C1C1C]/10 rounded-xl p-8 text-center text-sm text-[#2C1A0E]/60 ${OFFSET}`}>
          Couldn't load account info.
        </div>
      ) : (
        <div className="space-y-6">

          {/* Profile card */}
          <div className={`bg-[#FDFAF4] border border-[#1C1C1C]/10 rounded-xl p-5 ${OFFSET}`}>
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-full bg-[#1C1C1C]/5 flex items-center justify-center text-xl font-bold text-[#A8192E] border border-[#1C1C1C]/10 flex-shrink-0">
                {(data.user.full_name || data.user.email)[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-[#1C1C1C] truncate">
                  {data.user.full_name || 'Unnamed Organization'}
                </h3>
                <p className="text-sm text-[#2C1A0E]/60 truncate">{data.user.email}</p>
              </div>
              <span className="ml-auto px-3 py-1 rounded-full text-xs font-semibold capitalize bg-[#A8192E]/10 text-[#A8192E] flex-shrink-0">
                {data.user.plan} plan
              </span>
            </div>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 border border-[#1C1C1C]/15 rounded-lg text-sm font-medium text-[#A8192E] hover:bg-[#A8192E]/5 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
              Sign Out
            </button>
          </div>

          {/* Storage */}
          <div className={`bg-[#1C1C1C] text-[#FDFAF4] rounded-xl p-5 ${OFFSET}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[#FDFAF4]/60">Storage Used</span>
              <span className="text-sm font-bold">
                {data.storage.used_mb.toFixed(1)} / {data.storage.limit_mb.toFixed(0)}MB
              </span>
            </div>
            <div className="w-full bg-white/15 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${storagePercent > 80 ? 'bg-[#A8192E]' : 'bg-[#FDFAF4]'}`}
                style={{ width: `${Math.min(storagePercent, 100)}%` }}
              />
            </div>
          </div>

          {/* Plan & Billing */}
          <div className={`bg-[#FDFAF4] border border-[#1C1C1C]/10 rounded-xl p-5 ${OFFSET}`}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-[#1C1C1C]">Plan & Billing</h3>
              {data.user.plan !== 'free' && (
                <button
                  onClick={handleManageBilling}
                  disabled={portalLoading}
                  className={`flex items-center gap-2 px-3.5 py-2 bg-[#1C1C1C] text-[#FDFAF4] rounded-lg text-sm font-semibold hover:bg-[#1C1C1C]/85 transition-all disabled:opacity-50 ${OFFSET_BTN}`}
                >
                  <span className="material-symbols-outlined text-lg">credit_card</span>
                  {portalLoading ? 'Opening...' : 'Manage Billing'}
                </button>
              )}
            </div>

            {data.user.plan === 'free' ? (
              <>
                <p className="text-sm text-[#2C1A0E]/60 mb-5">You're on the Free plan. Upgrade to unlock AI-drafted proposals.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        onClick={() => handleUpgrade(tier.id)}
                        disabled={upgradingPlan !== null}
                        className={`w-full py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 ${
                          tier.highlighted
                            ? `bg-[#A8192E] text-[#FDFAF4] hover:bg-[#8f1526] ${OFFSET_BTN}`
                            : `bg-[#1C1C1C] text-[#FDFAF4] hover:bg-[#1C1C1C]/85 ${OFFSET_BTN}`
                        }`}
                      >
                        {upgradingPlan === tier.id ? 'Redirecting...' : 'Upgrade'}
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-[#2C1A0E]/60">
                You're on the <span className="font-semibold text-[#1C1C1C] capitalize">{data.user.plan}</span> plan.
                Manage your subscription, payment method, and invoices from the billing portal.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
