'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { Grant, FeedData } from '@/lib/types'
import { EmptyState } from '@/components/ui/EmptyState'
import { OFFSET, OFFSET_HOVER, OFFSET_BTN } from '@/lib/theme'

function daysLeftFor(deadline: string): number | null {
  if (!deadline || deadline === 'None') return null
  const d = new Date(deadline)
  if (isNaN(d.getTime())) return null
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function parseAmount(amount: string): number {
  if (!amount) return 0
  const n = parseFloat(amount.replace(/[^0-9.]/g, ''))
  return isNaN(n) ? 0 : n
}

function GrantCard({ grant, onApply, onOpen }: { grant: Grant, onApply: (id: string) => void, onOpen: (grant: Grant) => void }) {
  const router = useRouter()
  const daysLeft = daysLeftFor(grant.deadline)
  const isUrgent = daysLeft !== null && daysLeft <= 30

  return (
    <div
      onClick={() => onOpen(grant)}
      className={`bg-[#FDFAF4] border border-[#1C1C1C]/10 rounded-2xl p-4 cursor-pointer ${OFFSET} ${OFFSET_HOVER} transition-shadow duration-200`}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#A8192E] text-[#FDFAF4] font-bold text-sm flex-shrink-0">
          {grant.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-[#1C1C1C] truncate">
            {grant.name}
          </h4>
          {grant.link && (
            <a
              href={grant.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[11px] text-[#2C1A0E]/50 hover:text-[#A8192E] truncate block"
            >
              {grant.link}
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-[#1C1C1C]/8 pt-3 mb-4">
        <div>
          <div className="text-[11px] text-[#2C1A0E]/50 mb-0.5">Funding</div>
          <div className="text-sm font-bold text-[#A8192E]">
            {grant.amount || '—'}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-[#2C1A0E]/50 mb-0.5">Deadline</div>
          <div className="text-xs font-semibold text-[#1C1C1C]">
            {daysLeft !== null
              ? new Date(grant.deadline).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric'
                })
              : '—'}
          </div>
          {isUrgent && daysLeft !== null && daysLeft > 0 && (
            <div className="text-[11px] text-[#A8192E] font-medium">{daysLeft}d left</div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[#A8192E] font-medium">
          {!grant.applied && isUrgent ? '⚡ Closing soon' : ''}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            grant.applied ? router.push('/hub') : onApply(grant.id)
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            grant.applied
              ? `bg-[#1C1C1C] text-[#FDFAF4] hover:bg-[#1C1C1C]/85 ${OFFSET_BTN}`
              : `bg-[#A8192E] text-[#FDFAF4] hover:bg-[#8f1526] ${OFFSET_BTN}`
          }`}
        >
          {grant.applied ? 'Go to Hub' : 'Apply Now'}
        </button>
      </div>
    </div>
  )
}

function DetailBlock({ label, value }: { label: string, value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wide text-[#2C1A0E]/50 mb-1">{label}</div>
      <p className="text-sm text-[#1C1C1C] whitespace-pre-wrap leading-relaxed">{value}</p>
    </div>
  )
}

function GrantDetailModal({ grant, onClose, onApply }: { grant: Grant, onClose: () => void, onApply: (id: string) => void }) {
  const router = useRouter()
  const daysLeft = daysLeftFor(grant.deadline)

  return (
    <div className="fixed inset-0 bg-[#1C1C1C]/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#FDFAF4] border border-[#1C1C1C]/10 rounded-2xl shadow-[0_8px_32px_rgba(28,28,28,0.18)] p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#A8192E] text-[#FDFAF4] font-bold flex-shrink-0">
              {grant.name[0]}
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-[#1C1C1C]">{grant.name}</h3>
              {grant.link && (
                <a
                  href={grant.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#2C1A0E]/50 hover:text-[#A8192E] break-all"
                >
                  {grant.link}
                </a>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#1C1C1C]/5 text-[#2C1A0E]/60 flex-shrink-0">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-b border-[#1C1C1C]/8 py-4 mb-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-[#2C1A0E]/50 mb-1">Funding</div>
            <div className="text-base font-bold text-[#A8192E]">{grant.amount || '—'}</div>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-[#2C1A0E]/50 mb-1">Deadline</div>
            <div className="text-sm font-semibold text-[#1C1C1C]">
              {daysLeft !== null
                ? new Date(grant.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—'}
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <DetailBlock label="Description" value={grant.description} />
          <DetailBlock label="Eligibility Requirements" value={grant.details?.eligibility_requirements} />
          <DetailBlock label="Restrictions" value={grant.details?.restrictions} />
          <DetailBlock label="Required Documents" value={grant.details?.required_documents} />
          {!grant.description && !grant.details?.eligibility_requirements && !grant.details?.restrictions && !grant.details?.required_documents && (
            <p className="text-sm text-[#2C1A0E]/50">No further details available for this grant yet.</p>
          )}
        </div>

        <button
          onClick={() => {
            if (grant.applied) {
              router.push('/hub')
            } else {
              onApply(grant.id)
              onClose()
            }
          }}
          className={`w-full py-2.5 rounded-lg text-sm font-bold transition-all ${
            grant.applied
              ? `bg-[#1C1C1C] text-[#FDFAF4] hover:bg-[#1C1C1C]/85 ${OFFSET_BTN}`
              : `bg-[#A8192E] text-[#FDFAF4] hover:bg-[#8f1526] ${OFFSET_BTN}`
          }`}
        >
          {grant.applied ? 'Go to Hub' : 'Apply Now'}
        </button>
      </div>
    </div>
  )
}

export default function FeedPage() {
  const [feed, setFeed] = useState<FeedData>({ prime_match: [], moderate_fit: [], low_probability: [] })
  const [activeTab, setActiveTab] = useState<'prime_match' | 'moderate_fit' | 'low_probability'>('prime_match')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [submitForm, setSubmitForm] = useState({ name: '', link: '' })
  const [submitFile, setSubmitFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [selectedGrant, setSelectedGrant] = useState<Grant | null>(null)
  const [toast, setToast] = useState<{ message: string, runId?: string } | null>(null)

  function showToast(message: string, runId?: string) {
    setToast({ message, runId })
    setTimeout(() => setToast(null), runId ? 8000 : 5000)
  }
  const fileInputRef = useRef<HTMLInputElement>(null)

  // filters
  const [search, setSearch] = useState('')
  const [urgentOnly, setUrgentOnly] = useState(false)
  const [sortBy, setSortBy] = useState<'deadline' | 'amount'>('deadline')

  useEffect(() => {
    fetchFeed()
  }, [])

  async function fetchFeed() {
    try {
      const res = await api.get('/feeds/')
      setFeed(res.data)
    } catch (err) {
      console.error('Failed to fetch feed:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleApply(grantId: string) {
    try {
      await api.post(`/feeds/${grantId}/apply`)
      fetchFeed()
    } catch (err) {
      console.error('Failed to apply:', err)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    try {
      const res = await api.post('/feeds/refresh')
      await fetchFeed()
      if (res.data?.run_id) {
        showToast(`Evaluated ${res.data.evaluated} grant${res.data.evaluated === 1 ? '' : 's'}.`, res.data.run_id)
      } else {
        showToast(res.data?.message || 'Feed refreshed.')
      }
    } catch (err) {
      console.error('Refresh failed:', err)
    } finally {
      setRefreshing(false)
    }
  }

  function handleFileSelect(file: File) {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Only PDF files are supported.')
      return
    }
    if (file.size > 15 * 1024 * 1024) {
      alert('File too large. Maximum size is 15MB.')
      return
    }
    setSubmitFile(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitLoading(true)
    try {
      const formData = new FormData()
      formData.append('name', submitForm.name)
      formData.append('link', submitForm.link)
      if (submitFile) formData.append('file', submitFile)
      await api.post('/feeds/submit', formData)
      setShowSubmitModal(false)
      setSubmitForm({ name: '', link: '' })
      setSubmitFile(null)
      fetchFeed()
      showToast('Grant added — it will appear in your feed shortly.')
    } catch (err) {
      console.error('Submit failed:', err)
      alert('Failed to add grant. Please check the details and try again.')
    } finally {
      setSubmitLoading(false)
    }
  }

  const tabs = [
    { key: 'prime_match', label: 'Prime Match', count: feed.prime_match.length },
    { key: 'moderate_fit', label: 'Moderate Fit', count: feed.moderate_fit.length },
    { key: 'low_probability', label: 'Low Probability', count: feed.low_probability.length },
  ] as const

  const visibleGrants = useMemo(() => {
    let grants = feed[activeTab]

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      grants = grants.filter(g => g.name.toLowerCase().includes(q))
    }

    if (urgentOnly) {
      grants = grants.filter(g => {
        const d = daysLeftFor(g.deadline)
        return d !== null && d > 0 && d <= 30
      })
    }

    grants = [...grants].sort((a, b) => {
      if (a.applied !== b.applied) return a.applied ? 1 : -1
      if (sortBy === 'amount') {
        return parseAmount(b.amount) - parseAmount(a.amount)
      }
      const da = daysLeftFor(a.deadline)
      const db = daysLeftFor(b.deadline)
      if (da === null) return 1
      if (db === null) return -1
      return da - db
    })

    return grants
  }, [feed, activeTab, search, urgentOnly, sortBy])

  return (
    <div className="max-w-7xl mx-auto">

      <p className="text-sm text-[#2C1A0E]/60 mb-5">
        Continuous AI-matched funding opportunities for your organization.
      </p>

      {/* Controls row: filters + actions together */}
      <div className="flex flex-wrap items-center gap-8 mb-8">
        <div className={`flex items-center bg-[#FDFAF4] border border-[#1C1C1C]/10 rounded-lg px-3 ${OFFSET}`}>
          <span className="material-symbols-outlined text-[#2C1A0E]/40 text-base mr-2">search</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search grants..."
            className="bg-transparent border-none focus:ring-0 text-sm w-44 outline-none py-2 text-[#1C1C1C] placeholder:text-[#2C1A0E]/40"
          />
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'deadline' | 'amount')}
          className={`border border-[#1C1C1C]/10 rounded-lg px-2.5 py-2 text-sm bg-[#FDFAF4] text-[#1C1C1C] focus:outline-none ${OFFSET}`}
        >
          <option value="deadline">Deadline: Soonest</option>
          <option value="amount">Amount: Highest</option>
        </select>

        <label className="flex items-center gap-2 text-xs text-[#2C1A0E]/70 cursor-pointer font-medium">
          <input
            type="checkbox"
            checked={urgentOnly}
            onChange={(e) => setUrgentOnly(e.target.checked)}
            className="rounded border-[#1C1C1C]/20 text-[#A8192E] focus:ring-[#A8192E]/20"
          />
          Closing within 30 days
        </label>

        <div className="ml-auto flex gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`flex items-center gap-2 px-3.5 py-2 bg-[#FDFAF4] border border-[#1C1C1C]/10 rounded-lg text-sm font-semibold text-[#1C1C1C] hover:bg-[#1C1C1C]/[0.03] transition-all disabled:opacity-50 ${OFFSET_BTN}`}
          >
            <span className={`material-symbols-outlined text-lg ${refreshing ? 'animate-spin' : ''}`}>refresh</span>
            <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh Feed'}</span>
          </button>
          <button
            onClick={() => setShowSubmitModal(true)}
            className={`flex items-center gap-2 px-3.5 py-2 bg-[#A8192E] text-[#FDFAF4] rounded-lg text-sm font-semibold hover:bg-[#8f1526] transition-all ${OFFSET_BTN}`}
          >
            <span className="material-symbols-outlined text-lg">add</span>
            <span className="hidden sm:inline">Add Grant</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-8 border-b border-[#1C1C1C]/8 mb-5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-2.5 text-sm font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-[#A8192E] text-[#1C1C1C]'
                : 'border-transparent text-[#2C1A0E]/45 hover:text-[#1C1C1C]'
            }`}
          >
            {tab.label}
            <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
              activeTab === tab.key
                ? 'bg-[#A8192E] text-[#FDFAF4]'
                : 'bg-[#1C1C1C]/5 text-[#2C1A0E]/50'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Grant Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-[#A8192E] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
          {visibleGrants.length > 0
            ? visibleGrants.map((grant) => (
                <GrantCard
                  key={grant.id}
                  grant={grant}
                  onApply={handleApply}
                  onOpen={setSelectedGrant}
                />
              ))
            : <EmptyState
                icon="search_off"
                title={`No ${tabs.find(t => t.key === activeTab)?.label || ''} grants match your filters`}
                className="col-span-full"
              />
          }
        </div>
      )}

      {/* Grant Detail Modal */}
      {selectedGrant && (
        <GrantDetailModal
          grant={selectedGrant}
          onClose={() => setSelectedGrant(null)}
          onApply={handleApply}
        />
      )}

      {/* Submit Grant Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-[#1C1C1C]/40 z-50 flex items-center justify-center p-4">
          <div className="bg-[#FDFAF4] border border-[#1C1C1C]/10 rounded-2xl shadow-[0_8px_32px_rgba(28,28,28,0.18)] p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-[#1C1C1C]">Add a Grant</h3>
              <button
                onClick={() => { setShowSubmitModal(false); setSubmitFile(null) }}
                className="p-2 rounded-lg hover:bg-[#1C1C1C]/5 text-[#2C1A0E]/60"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#2C1A0E]/70 mb-1">
                  Grant Name
                </label>
                <input
                  type="text"
                  value={submitForm.name}
                  onChange={(e) => setSubmitForm({ ...submitForm, name: e.target.value })}
                  className="w-full border border-[#1C1C1C]/15 rounded-lg px-4 py-2.5 text-sm bg-[#F5F0E8] text-[#1C1C1C] focus:outline-none focus:border-[#A8192E]/50"
                  placeholder="e.g. Tony Elumelu Foundation Grant"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#2C1A0E]/70 mb-1">
                  Grant Link
                </label>
                <input
                  type="url"
                  value={submitForm.link}
                  onChange={(e) => setSubmitForm({ ...submitForm, link: e.target.value })}
                  className="w-full border border-[#1C1C1C]/15 rounded-lg px-4 py-2.5 text-sm bg-[#F5F0E8] text-[#1C1C1C] focus:outline-none focus:border-[#A8192E]/50"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#2C1A0E]/70 mb-1">
                  Or upload grant document
                </label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDragOver(false)
                    const file = e.dataTransfer.files[0]
                    if (file) handleFileSelect(file)
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    dragOver
                      ? 'border-[#A8192E] bg-[#F5F0E8]'
                      : 'border-[#1C1C1C]/15 hover:border-[#A8192E]/50'
                  }`}
                >
                  {submitFile ? (
                    <div className="flex items-center gap-2 justify-center text-sm text-[#1C1C1C] font-medium">
                      <span className="material-symbols-outlined text-lg">attach_file</span>
                      <span className="truncate max-w-[240px]">{submitFile.name}</span>
                    </div>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-3xl text-[#2C1A0E]/40 mb-2 block">
                        upload_file
                      </span>
                      <p className="text-sm text-[#2C1A0E]/60">
                        Drag & drop or <span className="text-[#A8192E] font-semibold">browse</span>
                      </p>
                      <p className="text-xs text-[#2C1A0E]/40 mt-1">PDF up to 15MB</p>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowSubmitModal(false); setSubmitFile(null) }}
                  className="flex-1 py-2.5 border border-[#1C1C1C]/15 rounded-lg text-sm font-semibold text-[#1C1C1C] hover:bg-[#1C1C1C]/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className={`flex-1 py-2.5 bg-[#A8192E] text-[#FDFAF4] rounded-lg text-sm font-semibold hover:bg-[#8f1526] transition-all disabled:opacity-50 ${OFFSET_BTN}`}
                >
                  {submitLoading ? 'Submitting...' : 'Submit Grant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-[#1C1C1C] text-[#FDFAF4] rounded-xl px-4 py-3 z-50 ${OFFSET}`}>
          <span className="material-symbols-outlined text-[#FDFAF4]/70">check_circle</span>
          <p className="text-sm">{toast.message}</p>
          {toast.runId && (
            <Link href={`/agents?run=${toast.runId}`} className="text-sm font-semibold underline flex-shrink-0">
              Watch Progress
            </Link>
          )}
          <button onClick={() => setToast(null)} className="text-[#FDFAF4]/50 hover:text-[#FDFAF4] flex-shrink-0">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      )}

    </div>
  )
}
