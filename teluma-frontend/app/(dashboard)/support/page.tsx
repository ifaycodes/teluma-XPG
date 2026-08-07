'use client'
import { useState } from 'react'
import Link from 'next/link'
import { OFFSET } from '@/lib/theme'

const STEPS = [
  {
    icon: 'person',
    title: 'Complete your profile',
    description: "Your organization type and area of focus (set at signup) are what agents use to judge grant fit — accurate details here mean better matches on your Feed.",
  },
  {
    icon: 'inventory_2',
    title: 'Upload documents to your Vault',
    description: 'Legal, tax, financial, and organizational documents that agents reference when evaluating fit and drafting proposals. Tag each one so it stays easy to find — the more you upload, the stronger your drafts.',
    cta: { label: 'Go to Vault', href: '/vault' },
  },
  {
    icon: 'rss_feed',
    title: 'Check your Feed',
    description: 'Grants discovered automatically are scored against your organization and sorted into Prime Match, Moderate Fit, or Low Probability. Click Refresh Feed to evaluate anything new, or add a grant yourself if you already have one in mind.',
    cta: { label: 'Go to Feed', href: '/feed' },
  },
  {
    icon: 'send',
    title: 'Apply to a grant',
    description: "Hitting Apply Now kicks off an agent that drafts a proposal outline for that grant — you'll see it move to your Hub right away.",
  },
  {
    icon: 'hub',
    title: 'Review, chat, and approve in the Hub',
    description: 'Each application walks through outline → full proposal & budget. Open View Draft to read what was written, or use the chat to ask for changes — a headline, tone, a budget line — before approving each stage.',
    cta: { label: 'Go to Hub', href: '/hub' },
  },
  {
    icon: 'check_circle',
    title: 'Submit',
    description: "Once the proposal's approved, Submit Application marks it as sent. You can track submission status from the Hub or your Dashboard at any time.",
  },
  {
    icon: 'smart_toy',
    title: 'Watch it happen live',
    description: 'Every discovery run and draft in progress shows a real step-by-step log — tool calls, handoffs between agents, what it\'s working on right now — instead of just a spinner.',
    cta: { label: 'Go to Agents', href: '/agents' },
  },
]

function HowItWorksCard() {
  const [open, setOpen] = useState(false)
  return (
    <div className={`bg-[#1C1C1C] rounded-xl overflow-hidden ${OFFSET}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left"
      >
        <span className="material-symbols-outlined text-[#FDFAF4]">map</span>
        <span className="flex-1 text-sm font-bold text-[#FDFAF4]">How Teluma Works</span>
        <span className={`material-symbols-outlined text-[#FDFAF4]/50 transition-transform ${open ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-4">
          {STEPS.map((step, i) => (
            <div key={step.title} className="flex gap-3">
              <div className="w-7 h-7 rounded-lg bg-[#A8192E] text-[#FDFAF4] font-bold flex items-center justify-center text-xs flex-shrink-0">
                {i + 1}
              </div>
              <div className="min-w-0 pb-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="material-symbols-outlined text-[#FDFAF4]/70 text-base">{step.icon}</span>
                  <h4 className="text-sm font-semibold text-[#FDFAF4]">{step.title}</h4>
                </div>
                <p className="text-sm text-[#FDFAF4]/60 leading-relaxed mb-2">{step.description}</p>
                {step.cta && (
                  <Link
                    href={step.cta.href}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FDFAF4] text-[#1C1C1C] rounded-lg text-xs font-semibold hover:bg-[#FDFAF4]/85 transition-colors"
                  >
                    {step.cta.label}
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const FAQS = [
  {
    icon: 'rss_feed',
    question: 'How does the Grant Intelligence Feed work?',
    answer: 'Grants are matched against your organization\'s profile and sorted into Recommended, Strong Fit, or Not Qualified. You can also add a grant manually from the Feed page if you already have one in mind.',
  },
  {
    icon: 'inventory_2',
    question: 'What should I upload to the Vault?',
    answer: 'Legal, tax, financial, and organizational documents that agents reference when evaluating grant fit and drafting proposals. Tag each document so it\'s easy to find later — storage usage is shown at the top of the Vault page.',
  },
  {
    icon: 'smart_toy',
    question: 'What does the Agent Monitor show?',
    answer: 'Every discovery run, whether triggered manually or on schedule, along with a live activity log of each step the agent takes. Select any run from the list to see its full history.',
  },
  {
    icon: 'hub',
    question: 'How do I move an application forward?',
    answer: 'Once you apply to a grant, an agent drafts an outline for you to approve, then a full proposal and budget. Review and approve each stage from the Hub, or use the chat panel on an application to request changes.',
  },
]

function FaqItem({ icon, question, answer }: { icon: string, question: string, answer: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`bg-[#FDFAF4] border border-[#1C1C1C]/10 rounded-xl overflow-hidden ${OFFSET}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left"
      >
        <span className="material-symbols-outlined text-[#A8192E] flex-shrink-0">{icon}</span>
        <span className="flex-1 text-sm font-medium text-[#1C1C1C]">{question}</span>
        <span className={`material-symbols-outlined text-[#2C1A0E]/50 transition-transform ${open ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>
      {open && (
        <div className="px-5 pb-4 pl-[52px]">
          <p className="text-sm text-[#2C1A0E]/60 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  )
}

export default function SupportPage() {
  return (
    <div className="max-w-3xl mx-auto">

      <p className="text-sm text-[#2C1A0E]/60 mb-6">Answers to common questions about using Teluma</p>

      <div className="mb-3">
        <HowItWorksCard />
      </div>

      <div className="space-y-3">
        {FAQS.map((faq) => (
          <FaqItem key={faq.question} {...faq} />
        ))}
      </div>

      <div className={`mt-6 bg-[#FDFAF4] border border-[#1C1C1C]/10 rounded-xl p-5 text-center ${OFFSET}`}>
        <span className="material-symbols-outlined text-3xl text-[#2C1A0E]/40 mb-2 block">forum</span>
        <p className="text-sm text-[#2C1A0E]/60">
          Still stuck? Reach out to your workspace administrator for further help.
        </p>
      </div>
    </div>
  )
}
