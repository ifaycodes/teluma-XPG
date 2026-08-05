'use client'
import { useState } from 'react'
import { OFFSET } from '@/lib/theme'

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
