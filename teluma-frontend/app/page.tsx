'use client'
import { useState } from 'react'
import Link from 'next/link'
import { OFFSET, OFFSET_HOVER, OFFSET_BTN } from '@/lib/theme'

const PROBLEMS = [
  {
    icon: 'search_off',
    title: "You can't find them.",
    body: "Opportunities are scattered across foundation portals, government PDFs nobody indexes, and international funding boards that publish on Thursday and close in 21 days. Aggregators are stale. You only find out from a peer after the deadline passes.",
  },
  {
    icon: 'help',
    title: "You can't tell if you qualify.",
    body: "So you guess. You read a 60-page RFP, convince yourself the eligibility language is flexible, and spend three weeks on an application that a program officer disqualifies in ninety seconds.",
  },
  {
    icon: 'draft',
    title: 'And then you still have to write it.',
    body: 'The same organizational history, the same budget narrative, the same theory of change — retyped, reformatted, and re-argued for every funder, by whoever has the least sleep.',
  },
]

const STEPS = [
  {
    number: '01',
    icon: 'travel_explore',
    title: 'Discover',
    body: "Teluma's discovery agent scans the web on a regular schedule, surfacing active grants and funding opportunities — name, funding amount, deadline, and a summary — straight into your feed.",
  },
  {
    number: '02',
    icon: 'fact_check',
    title: 'Match',
    body: "Upload your organization's documents to the Vault — pitch decks, past proposals, financials. Refresh your feed and Teluma scores every discovered grant against them, sorting each into Recommended, Strong Fit, or Not Qualified, so you always know exactly where you stand.",
  },
  {
    number: '03',
    icon: 'edit_document',
    title: 'Draft',
    body: 'Apply to a match and Teluma drafts a proposal outline grounded in your vault documents for you to review. Approve it, and it writes the full proposal and budget. Chat with the agent anytime to request changes before you submit.',
  },
]

// NGN figures are an estimate only (USD is what's actually charged) — see
// the disclaimer under the pricing grid. Calculated at $1 = ₦1,400.
const TIERS = [
  {
    name: 'Starter',
    priceUsd: '$10',
    priceNgn: '≈ ₦14,000',
    period: '/mo',
    description: 'For small teams running a targeted funding pipeline.',
    features: [
      '5 AI-drafted proposals/mo',
      'Full live discovery engine',
      'Fit-scoring on all matches',
      '20 core documents (500MB)',
    ],
    cta: 'Start Free Trial',
    highlighted: false,
  },
  {
    name: 'Pro',
    badge: 'Most Popular',
    priceUsd: '$25',
    priceNgn: '≈ ₦35,000',
    period: '/mo',
    description: 'For active teams applying to every qualified grant.',
    features: [
      'UNLIMITED AI-drafted proposals',
      'Priority 24/7 discovery alerts',
      'Full proposal history memory',
      '100 core documents (2GB)',
    ],
    cta: 'Get Started Instantly',
    highlighted: true,
  },
  {
    name: 'Agency / Consultant',
    priceUsd: '$80',
    priceNgn: '≈ ₦112,000',
    period: '/mo',
    description: 'For grant writers, consultants, and multi-program NGOs.',
    features: [
      'UNLIMITED AI-drafted proposals',
      'Multi-organization profiles (up to 5)',
      'Exportable audit & compliance logs',
      'Dedicated agent resource allocation',
    ],
    cta: 'Talk to Sales / Book Demo',
    highlighted: false,
  },
]

const FAQS = [
  {
    question: 'Does Teluma invent or hallucinate information?',
    answer: "No. Teluma writes strictly using the facts and history in your uploaded documents. If a required piece of data is missing, the agent flags it as an explicit prompt for you to fill in rather than making it up.",
  },
  {
    question: 'How fast do new grants show up?',
    answer: 'Discovery runs on a regular schedule throughout the day, and you can trigger a fresh run yourself any time. New funding calls typically land in your feed within hours of being found.',
  },
  {
    question: 'Is my organizational data safe?',
    answer: 'Your documents are stored per-organization and only used to evaluate fit and draft your own applications. They are not used for anything else.',
  },
  {
    question: "What if I don't have perfect, formatted documents?",
    answer: 'Upload whatever you have — old pitch decks, rough notes, past PDF applications, or financial sheets. Teluma works from real-world files, not a template.',
  },
]

function FaqItem({ question, answer }: { question: string, answer: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`bg-[#FDFAF4] border border-[#1C1C1C]/10 rounded-xl overflow-hidden ${OFFSET}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left"
      >
        <span className="flex-1 text-sm font-semibold text-[#1C1C1C]">{question}</span>
        <span className={`material-symbols-outlined text-[#2C1A0E]/50 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>
      {open && (
        <div className="px-5 pb-4">
          <p className="text-sm text-[#2C1A0E]/60 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F5F0E8]">

      {/* Nav */}
      <header className="flex items-center justify-between px-6 lg:px-10 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#A8192E] flex items-center justify-center">
            <span className="text-[#FDFAF4] text-lg font-bold">T</span>
          </div>
          <span className="font-bold text-lg text-[#1C1C1C]">Teluma</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-3">
          <a href="#pricing" className="px-4 py-2 text-sm font-medium text-[#1C1C1C] hover:opacity-70 transition-opacity">
            Pricing
          </a>
          <Link href="/login" className="px-4 py-2 text-sm font-medium text-[#1C1C1C] hover:opacity-70 transition-opacity">
            Sign In
          </Link>
          <Link
            href="/signup"
            className={`px-4 py-2 bg-[#A8192E] text-[#FDFAF4] rounded-lg text-sm font-semibold hover:bg-[#8f1526] transition-all ${OFFSET_BTN}`}
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto text-center px-6 pt-16 pb-20">
        <div className="inline-flex items-center gap-2 bg-[#FDFAF4] border border-[#1C1C1C]/10 rounded-full px-4 py-1.5 text-xs font-semibold text-[#2C1A0E]/70 mb-6">
          <span className="material-symbols-outlined text-sm text-[#A8192E]">bolt</span>
          AI-Native Grant Discovery, Fit-Scoring &amp; Application Drafting — On Autopilot
        </div>
        <h1 className="text-4xl lg:text-5xl font-black text-[#1C1C1C] mb-6 leading-tight">
          The grant you were perfect for closed last Tuesday.
        </h1>
        <p className="text-base text-[#2C1A0E]/70 mb-4 max-w-2xl mx-auto">
          You never saw it. Nobody told you. It wasn't on a list you subscribe to, and the one
          person who might have forwarded it was busy doing the actual work.
        </p>
        <p className="text-base text-[#2C1A0E]/70 mb-10 max-w-2xl mx-auto">
          Teluma runs continuous autonomous agents across the web to find every grant you could
          win, evaluates them against your actual organization documents, and drafts winning
          applications. You review. You submit.
        </p>
        <Link
          href="/signup"
          className={`inline-block px-6 py-3 bg-[#A8192E] text-[#FDFAF4] rounded-lg font-semibold text-sm hover:bg-[#8f1526] transition-all mb-6 ${OFFSET_BTN}`}
        >
          Run Your Free Grant Match →
        </Link>
        <p className="text-xs text-[#2C1A0E]/50 max-w-xl mx-auto mb-16">
          Built for non-profits, civic tech labs, research teams, and early-stage founders who
          are tired of funding being a game of who-you-know.
        </p>

        {/* Product glimpse — a stylized preview of a real feed match */}
        <div className="relative max-w-sm mx-auto">
          <div className="hidden sm:block absolute inset-0 bg-[#FDFAF4]/70 border border-[#1C1C1C]/10 rounded-2xl rotate-3 translate-x-3" />
          <div className={`relative bg-[#FDFAF4] border border-[#1C1C1C]/10 rounded-2xl p-5 text-left ${OFFSET}`}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wide text-[#A8192E] bg-[#A8192E]/10 px-2.5 py-1 rounded-full">
                Recommended
              </span>
              <span className="text-[11px] text-[#2C1A0E]/35">Example match</span>
            </div>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[#A8192E] flex items-center justify-center text-[#FDFAF4] font-bold flex-shrink-0">
                C
              </div>
              <div className="min-w-0">
                <h4 className="font-semibold text-sm text-[#1C1C1C] truncate">Clean Water Access Innovation Fund</h4>
                <p className="text-xs text-[#2C1A0E]/45 truncate">globalwaterfund.org</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-[#1C1C1C]/8 pt-3 mb-4">
              <div>
                <div className="text-[11px] text-[#2C1A0E]/50 mb-0.5">Funding</div>
                <div className="text-sm font-bold text-[#A8192E]">$85,000</div>
              </div>
              <div>
                <div className="text-[11px] text-[#2C1A0E]/50 mb-0.5">Deadline</div>
                <div className="text-xs font-semibold text-[#1C1C1C]">14 Sept 2026</div>
              </div>
            </div>
            <div className="px-3 py-2 bg-[#A8192E] text-[#FDFAF4] rounded-lg text-xs font-bold text-center">
              Apply Now
            </div>
          </div>
        </div>
      </section>

      {/* Problem — dark band for contrast */}
      <section className="bg-[#1C1C1C] py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl lg:text-3xl font-black text-[#FDFAF4] text-center mb-12">
            Grant-seeking is three broken jobs pretending to be one.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            {PROBLEMS.map((p) => (
              <div key={p.title} className="bg-[#FDFAF4]/[0.06] border border-[#FDFAF4]/10 rounded-xl p-5">
                <div className="w-10 h-10 rounded-lg bg-[#A8192E]/20 flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-[#A8192E]">{p.icon}</span>
                </div>
                <h3 className="font-bold text-[#FDFAF4] mb-2">{p.title}</h3>
                <p className="text-sm text-[#FDFAF4]/60 leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-[#FDFAF4] font-medium bg-[#A8192E]/20 rounded-xl p-5 max-w-3xl mx-auto">
            The result: most organizations apply to a handful of grants a year, chosen mostly by
            accident, and miss out on hundreds of millions in non-dilutive capital.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-20 scroll-mt-20">
        <h2 className="text-2xl lg:text-3xl font-black text-[#1C1C1C] text-center mb-2">
          Three continuous agents. One high-yield feed.
        </h2>
        <p className="text-sm text-[#2C1A0E]/60 text-center mb-12">
          What Teluma actually does, end to end.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          {STEPS.map((step, i) => (
            <div key={step.number} className="relative">
              <div className={`bg-[#FDFAF4] border border-[#1C1C1C]/10 rounded-xl p-6 h-full ${OFFSET} ${OFFSET_HOVER} transition-shadow`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-lg bg-[#A8192E]/10 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[#A8192E] text-xl">{step.icon}</span>
                  </div>
                  <span className="text-xs font-bold text-[#2C1A0E]/40 tracking-widest">{step.number}</span>
                </div>
                <h3 className="font-bold text-[#1C1C1C] mb-2">{step.title}</h3>
                <p className="text-sm text-[#2C1A0E]/60 leading-relaxed">{step.body}</p>
              </div>
              {i < STEPS.length - 1 && (
                <span className="hidden md:flex absolute top-1/2 -right-[26px] -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-[#F5F0E8] border border-[#1C1C1C]/10 items-center justify-center">
                  <span className="material-symbols-outlined text-[#A8192E] text-base">arrow_forward</span>
                </span>
              )}
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-[#2C1A0E]/50 max-w-md mx-auto">
          Your feed only ever contains grants scored against your own documents — no noise, no guesswork.
        </p>
      </section>

      {/* Pricing — dark band for contrast */}
      <section id="pricing" className="bg-[#1C1C1C] py-20 scroll-mt-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <h2 className="text-2xl lg:text-3xl font-black text-[#FDFAF4] mb-4">
              Start small. Upgrade when your pipeline explodes.
            </h2>
            <p className="text-sm text-[#FDFAF4]/60">
              Discovery and fit-scoring run continuously on every plan. What changes is how many
              AI-drafted proposals you generate per month.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start mb-10">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-2xl p-6 flex flex-col ${
                  tier.highlighted
                    ? 'bg-[#A8192E] text-[#FDFAF4] md:-translate-y-2 shadow-[4px_4px_0_0_#FDFAF4]'
                    : 'bg-[#FDFAF4]/[0.06] border border-[#FDFAF4]/10 text-[#FDFAF4]'
                }`}
              >
                {tier.badge && (
                  <span className="self-start px-3 py-1 rounded-full text-[11px] font-bold bg-[#FDFAF4] text-[#A8192E] mb-4">
                    {tier.badge}
                  </span>
                )}
                <h3 className="font-bold text-lg mb-1">{tier.name}</h3>
                <p className={`text-xs mb-4 ${tier.highlighted ? 'text-[#FDFAF4]/80' : 'text-[#FDFAF4]/50'}`}>
                  {tier.description}
                </p>
                <div className="mb-5">
                  <span className="text-3xl font-black">{tier.priceUsd}</span>
                  <span className={`text-sm ${tier.highlighted ? 'text-[#FDFAF4]/80' : 'text-[#FDFAF4]/50'}`}>{tier.period}</span>
                  <div className={`text-xs ${tier.highlighted ? 'text-[#FDFAF4]/70' : 'text-[#FDFAF4]/40'}`}>{tier.priceNgn}</div>
                </div>
                <ul className="space-y-2.5 mb-6 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <span className="material-symbols-outlined text-base flex-shrink-0">check_circle</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`text-center px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    tier.highlighted
                      ? 'bg-[#FDFAF4] text-[#A8192E] hover:opacity-90'
                      : 'bg-[#FDFAF4] text-[#1C1C1C] hover:opacity-90'
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-[#FDFAF4]/40 max-w-lg mx-auto">
            Billed in USD. Naira amounts are an estimate — the exact amount
            your card is charged depends on your bank's exchange rate at checkout.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-20">
        <h2 className="text-2xl font-black text-[#1C1C1C] text-center mb-8">Your Questions, answered</h2>
        <div className="space-y-3">
          {FAQS.map((faq) => (
            <FaqItem key={faq.question} {...faq} />
          ))}
        </div>
      </section>

      {/* Final CTA — dark band */}
      <section className="bg-[#1C1C1C] py-24">
        <div className="max-w-3xl mx-auto text-center px-6">
          <h2 className="text-2xl lg:text-3xl font-black text-[#FDFAF4] mb-4">
            The next grant you're perfect for is open right now.
          </h2>
          <p className="text-sm text-[#FDFAF4]/60 mb-8 max-w-xl mx-auto">
            Drop in one document — a past proposal, pitch deck, or project summary — and see real,
            live grants matched to your organization in minutes.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#A8192E] text-[#FDFAF4] rounded-lg font-semibold text-sm hover:bg-[#8f1526] transition-all"
          >
            Run a Live Grant Match Now →
          </Link>
          <p className="text-xs text-[#FDFAF4]/40 mt-4">No credit card required for initial fit scan. Cancel anytime.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1C1C1C]/10">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#2C1A0E]/50">
          <span>© {new Date().getFullYear()} Teluma</span>
          <div className="flex items-center gap-5">
            <a href="#pricing" className="hover:text-[#1C1C1C] transition-colors">Pricing</a>
            <Link href="/login" className="hover:text-[#1C1C1C] transition-colors">Sign In</Link>
            <Link href="/signup" className="hover:text-[#1C1C1C] transition-colors">Sign Up</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
