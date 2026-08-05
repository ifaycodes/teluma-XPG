'use client'
import { useEffect, useRef, useState } from 'react'
import api from '@/lib/api'
import { Application, ChatMessage } from '@/lib/types'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { OFFSET, OFFSET_BTN } from '@/lib/theme'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Ready to Submit',
  outline_in_progress: 'Drafting Outline',
  outline_review: 'Outline Ready for Review',
  proposal_in_progress: 'Drafting Proposal',
  proposal_review: 'Proposal Ready for Review',
  submitted: 'Submitted',
  failed: 'Failed',
  cancelled: 'Cancelled',
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-[#A8192E]/10 text-[#A8192E]',
  outline_in_progress: 'bg-[#1C1C1C]/5 text-[#2C1A0E]/60',
  outline_review: 'bg-[#A8192E]/10 text-[#A8192E]',
  proposal_in_progress: 'bg-[#1C1C1C]/5 text-[#2C1A0E]/60',
  proposal_review: 'bg-[#A8192E]/10 text-[#A8192E]',
  submitted: 'bg-[#1C1C1C]/10 text-[#1C1C1C]',
  failed: 'bg-[#A8192E]/10 text-[#A8192E]',
  cancelled: 'bg-[#1C1C1C]/5 text-[#2C1A0E]/60',
}

const IN_PROGRESS_STATUSES = ['outline_in_progress', 'proposal_in_progress']

function getAvailableFiles(app: Application): { kind: 'outline' | 'proposal' | 'budget', label: string }[] {
  const files: { kind: 'outline' | 'proposal' | 'budget', label: string }[] = []
  if (app.outline_gcs_path && !['outline_in_progress', 'outline_review'].includes(app.status)) {
    files.push({ kind: 'outline', label: 'Outline.pdf' })
  }
  // proposal + budget are written to the same document, so only one chip is shown
  if (['pending', 'submitted'].includes(app.status) && app.proposal_gcs_path) {
    files.push({ kind: 'proposal', label: 'Proposal & Budget.pdf' })
  }
  return files
}

function formatDate(ts: string | null) {
  if (!ts || ts === 'None') return '—'
  const d = new Date(ts)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function parseDraft(raw: string): any {
  let text = raw.trim()
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (fence) text = fence[1].trim()
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function DraftContent({ raw }: { raw: string }) {
  const parsed = parseDraft(raw)
  if (!parsed || typeof parsed !== 'object') {
    return <p className="text-sm text-[#1C1C1C] whitespace-pre-wrap leading-relaxed">{raw}</p>
  }
  return (
    <div className="space-y-3">
      {Object.entries(parsed).map(([key, value]) => (
        <div key={key}>
          <div className="text-xs font-bold uppercase tracking-wide text-[#2C1A0E]/50 mb-1">
            {key.replace(/_/g, ' ')}
          </div>
          {Array.isArray(value) ? (
            <div className="space-y-1.5">
              {value.map((item, i) => (
                <div key={i} className="text-sm text-[#1C1C1C] bg-[#F5F0E8] rounded-lg px-3 py-2">
                  {typeof item === 'object' && item !== null
                    ? Object.entries(item).map(([k, v]) => `${k}: ${v}`).join(' · ')
                    : String(item)}
                </div>
              ))}
            </div>
          ) : typeof value === 'object' && value !== null ? (
            <p className="text-sm text-[#1C1C1C] whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</p>
          ) : (
            <p className="text-sm text-[#1C1C1C] whitespace-pre-wrap leading-relaxed">{String(value)}</p>
          )}
        </div>
      ))}
    </div>
  )
}

function ApplicationCard({
  app,
  expanded,
  onToggle,
  content,
  loadingContent,
  chat,
  loadingChat,
  chatInput,
  setChatInput,
  sendingChat,
  onSendChat,
  actionLoading,
  onApproveOutline,
  onApproveProposal,
  onSubmit,
  onCancel,
  onRetry,
  onDownload,
  chatEndRef,
}: any) {
  return (
    <div className={`bg-[#FDFAF4] border border-[#1C1C1C]/10 rounded-xl overflow-hidden ${OFFSET}`}>
      <button
        onClick={onToggle}
        className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-[#1C1C1C]/[0.02] transition-colors"
      >
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-[#1C1C1C] truncate mb-1.5">{app.grant_name}</h4>
          <div className="flex items-center gap-3">
            <StatusBadge
              status={app.status}
              styles={STATUS_STYLES}
              label={STATUS_LABELS[app.status] || app.status}
              indicator={IN_PROGRESS_STATUSES.includes(app.status) ? 'spin' : 'none'}
            />
            <span className="text-xs text-[#2C1A0E]/50">Started {formatDate(app.started_at)}</span>
          </div>
        </div>
        <span className={`material-symbols-outlined text-[#2C1A0E]/40 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      {expanded && (
        <div className="border-t border-[#1C1C1C]/8 p-5 space-y-5">

          {/* Drafted content */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wide text-[#2C1A0E]/50 mb-2">Agent Draft</h5>
            <div className="bg-[#1C1C1C]/[0.03] rounded-lg p-4 max-h-72 overflow-y-auto">
              {loadingContent ? (
                <div className="flex justify-center py-4">
                  <div className="w-5 h-5 border-2 border-[#A8192E] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : content?.content ? (
                <DraftContent raw={content.content} />
              ) : (
                <p className="text-sm text-[#2C1A0E]/50">Nothing drafted yet for this stage.</p>
              )}
            </div>
          </div>

          {/* Chat */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wide text-[#2C1A0E]/50 mb-2">
              Ask for changes
            </h5>
            <div className="space-y-2 max-h-56 overflow-y-auto mb-3">
              {loadingChat ? (
                <div className="flex justify-center py-4">
                  <div className="w-5 h-5 border-2 border-[#A8192E] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : chat.length === 0 ? (
                <p className="text-sm text-[#2C1A0E]/50 py-2">No messages yet — ask the agent to change the headline, tone, a budget line, etc.</p>
              ) : (
                chat.map((msg: ChatMessage, i: number) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-xl px-3.5 py-2 text-sm ${
                      msg.role === 'user'
                        ? 'bg-[#1C1C1C] text-[#FDFAF4]'
                        : 'bg-[#1C1C1C]/5 text-[#1C1C1C]'
                    }`}>
                      {msg.message}
                    </div>
                  </div>
                ))
              )}
              {getAvailableFiles(app).map((file) => (
                <div key={file.kind} className="flex justify-start">
                  <button
                    onClick={() => onDownload(file.kind)}
                    className="flex items-center gap-2 max-w-[85%] rounded-xl px-3.5 py-2 text-sm bg-[#1C1C1C]/5 text-[#1C1C1C] hover:bg-[#1C1C1C]/10 transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg text-[#A8192E]">description</span>
                    <span className="font-medium">{file.label}</span>
                    <span className="material-symbols-outlined text-sm text-[#2C1A0E]/50">download</span>
                  </button>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={onSendChat} className="flex gap-2">
              <input
                value={chatInput}
                onChange={(e: any) => setChatInput(e.target.value)}
                placeholder="e.g. change the headline to..."
                disabled={sendingChat}
                className="flex-1 border border-[#1C1C1C]/15 rounded-lg px-3.5 py-2 text-sm bg-[#F5F0E8] text-[#1C1C1C] focus:outline-none focus:border-[#A8192E]/50"
              />
              <button
                type="submit"
                disabled={sendingChat || !chatInput.trim()}
                className={`px-3.5 py-2 bg-[#A8192E] text-[#FDFAF4] rounded-lg text-sm font-medium hover:bg-[#8f1526] transition-all disabled:opacity-50 flex items-center justify-center ${OFFSET_BTN}`}
              >
                <span className="material-symbols-outlined text-lg">send</span>
              </button>
            </form>
          </div>

          {/* Actions */}
          <div className="flex gap-3 border-t border-[#1C1C1C]/8 pt-4">
            {app.status === 'outline_review' && (
              <button
                onClick={onApproveOutline}
                disabled={actionLoading}
                className={`px-4 py-2 bg-[#A8192E] text-[#FDFAF4] rounded-lg text-sm font-semibold hover:bg-[#8f1526] transition-all disabled:opacity-50 ${OFFSET_BTN}`}
              >
                Approve Outline
              </button>
            )}
            {app.status === 'proposal_review' && (
              <button
                onClick={onApproveProposal}
                disabled={actionLoading}
                className={`px-4 py-2 bg-[#A8192E] text-[#FDFAF4] rounded-lg text-sm font-semibold hover:bg-[#8f1526] transition-all disabled:opacity-50 ${OFFSET_BTN}`}
              >
                Approve Proposal
              </button>
            )}
            {app.status === 'pending' && (
              <button
                onClick={onSubmit}
                disabled={actionLoading}
                className={`px-4 py-2 bg-[#1C1C1C] text-[#FDFAF4] rounded-lg text-sm font-semibold hover:bg-[#1C1C1C]/85 transition-all disabled:opacity-50 ${OFFSET_BTN}`}
              >
                Submit Application
              </button>
            )}
            {IN_PROGRESS_STATUSES.includes(app.status) && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-[#2C1A0E]/60 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full border-2 border-[#A8192E] border-t-transparent animate-spin" />
                  Agent is working on this stage
                </span>
                <button
                  onClick={onCancel}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#A8192E]/10 text-[#A8192E] rounded-lg text-xs font-medium hover:bg-[#A8192E]/20 transition-colors disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">stop_circle</span>
                  Stop
                </button>
              </div>
            )}
            {app.status === 'submitted' && (
              <span className="text-sm text-[#1C1C1C] flex items-center gap-2 font-medium">
                <span className="material-symbols-outlined text-lg">check_circle</span>
                Submitted on {formatDate(app.submitted_at)}
              </span>
            )}
            {app.status === 'failed' && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-[#A8192E] flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">error</span>
                  Something went wrong on this stage
                </span>
                <button
                  onClick={onRetry}
                  disabled={actionLoading}
                  className={`px-4 py-2 bg-[#A8192E] text-[#FDFAF4] rounded-lg text-sm font-semibold hover:bg-[#8f1526] transition-all disabled:opacity-50 ${OFFSET_BTN}`}
                >
                  Retry
                </button>
              </div>
            )}
            {app.status === 'cancelled' && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-[#2C1A0E]/60 flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">block</span>
                  Stopped before completing this stage
                </span>
                <button
                  onClick={onRetry}
                  disabled={actionLoading}
                  className={`px-4 py-2 bg-[#A8192E] text-[#FDFAF4] rounded-lg text-sm font-semibold hover:bg-[#8f1526] transition-all disabled:opacity-50 ${OFFSET_BTN}`}
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function HubPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loadingApps, setLoadingApps] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const [content, setContent] = useState<{ kind: string | null, content: string | null } | null>(null)
  const [loadingContent, setLoadingContent] = useState(false)

  const [chat, setChat] = useState<ChatMessage[]>([])
  const [loadingChat, setLoadingChat] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [sendingChat, setSendingChat] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchApplications()
  }, [])

  useEffect(() => {
    if (expandedId) {
      fetchContent(expandedId)
      fetchChat(expandedId)
    }
  }, [expandedId])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat])

  // poll while any application has an active background job, since
  // approve-outline/apply return immediately instead of waiting for it
  useEffect(() => {
    const hasInProgress = applications.some(a => IN_PROGRESS_STATUSES.includes(a.status))
    if (!hasInProgress) return
    const interval = setInterval(fetchApplications, 4000)
    return () => clearInterval(interval)
  }, [applications])

  async function fetchApplications() {
    try {
      const res = await api.get('/hub/')
      setApplications(res.data || [])
    } catch (err) {
      console.error('Failed to fetch applications:', err)
    } finally {
      setLoadingApps(false)
    }
  }

  async function fetchContent(id: string) {
    setLoadingContent(true)
    try {
      const res = await api.get(`/hub/${id}/content`)
      setContent(res.data)
    } catch (err) {
      console.error('Failed to fetch draft content:', err)
      setContent(null)
    } finally {
      setLoadingContent(false)
    }
  }

  async function fetchChat(id: string) {
    setLoadingChat(true)
    try {
      const res = await api.get(`/hub/${id}/chat`)
      setChat(res.data || [])
    } catch (err) {
      console.error('Failed to fetch chat:', err)
    } finally {
      setLoadingChat(false)
    }
  }

  function toggle(id: string) {
    setExpandedId(prev => (prev === id ? null : id))
  }

  async function handleApproveOutline(id: string) {
    setActionLoading(true)
    try {
      await api.post(`/hub/${id}/approve-outline`)
      await fetchApplications()
    } catch (err) {
      console.error('Failed to approve outline:', err)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleApproveProposal(id: string) {
    setActionLoading(true)
    try {
      await api.post(`/hub/${id}/approve-proposal`)
      await fetchApplications()
    } catch (err) {
      console.error('Failed to approve proposal:', err)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleSubmitApplication(id: string) {
    if (!confirm('Submit this application? This cannot be undone.')) return
    setActionLoading(true)
    try {
      await api.post(`/hub/${id}/submit`)
      await fetchApplications()
    } catch (err) {
      console.error('Failed to submit application:', err)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleCancel(id: string) {
    setActionLoading(true)
    try {
      await api.post(`/hub/${id}/cancel`)
      await fetchApplications()
    } catch (err) {
      console.error('Failed to cancel job:', err)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleRetry(grantId: string) {
    setActionLoading(true)
    try {
      await api.post(`/feeds/${grantId}/apply`)
      await fetchApplications()
    } catch (err) {
      console.error('Failed to retry application:', err)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDownload(id: string, kind: 'outline' | 'proposal' | 'budget') {
    try {
      const res = await api.get(`/hub/${id}/download`, { params: { kind } })
      window.open(res.data.download_url, '_blank')
    } catch (err) {
      console.error('Download failed:', err)
    }
  }

  async function handleSendChat(e: React.FormEvent) {
    e.preventDefault()
    if (!expandedId || !chatInput.trim()) return
    const message = chatInput.trim()
    setChatInput('')
    setSendingChat(true)
    setChat(prev => [...prev, { role: 'user', message, created_at: new Date().toISOString() }])
    try {
      const res = await api.post(`/hub/${expandedId}/chat`, { message })
      setChat(prev => [...prev, { role: 'agent', message: res.data.response, created_at: new Date().toISOString() }])
    } catch (err) {
      console.error('Failed to send chat:', err)
    } finally {
      setSendingChat(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">

      <p className="text-sm text-[#2C1A0E]/60 mb-6">
        Review outlines and proposals, chat through revisions, and track submissions
      </p>

      {loadingApps ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-[#A8192E] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : applications.length === 0 ? (
        <div className={`bg-[#FDFAF4] border border-[#1C1C1C]/10 rounded-xl p-8 text-center text-sm text-[#2C1A0E]/50 ${OFFSET}`}>
          No applications yet. Apply to a grant from the Feed to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <ApplicationCard
              key={app.id}
              app={app}
              expanded={expandedId === app.id}
              onToggle={() => toggle(app.id)}
              content={expandedId === app.id ? content : null}
              loadingContent={loadingContent}
              chat={chat}
              loadingChat={loadingChat}
              chatInput={chatInput}
              setChatInput={setChatInput}
              sendingChat={sendingChat}
              onSendChat={handleSendChat}
              actionLoading={actionLoading}
              onApproveOutline={() => handleApproveOutline(app.id)}
              onApproveProposal={() => handleApproveProposal(app.id)}
              onSubmit={() => handleSubmitApplication(app.id)}
              onCancel={() => handleCancel(app.id)}
              onRetry={() => handleRetry(app.grant_id)}
              onDownload={(kind: 'outline' | 'proposal' | 'budget') => handleDownload(app.id, kind)}
              chatEndRef={chatEndRef}
            />
          ))}
        </div>
      )}
    </div>
  )
}
