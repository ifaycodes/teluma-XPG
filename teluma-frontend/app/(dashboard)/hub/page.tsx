'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import api from '@/lib/api'
import { Application, ChatMessage, AgentStep } from '@/lib/types'
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

function DraftModal({ app, content, loadingContent, onClose }: any) {
  const title = content?.kind === 'proposal' ? 'Proposal & Budget' : content?.kind === 'outline' ? 'Proposal Outline' : 'Draft'
  return (
    <div className="fixed inset-0 bg-[#1C1C1C]/60 z-[100] flex items-center justify-center p-4">
      <div className="bg-[#FDFAF4] rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-[0_8px_32px_rgba(28,28,28,0.25)]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1C1C1C]/10 flex-shrink-0">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-[#1C1C1C] truncate">{title}</h3>
            <p className="text-xs text-[#2C1A0E]/50 truncate">{app.grant_name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#1C1C1C]/5 text-[#2C1A0E]/60 flex-shrink-0">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {loadingContent ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-[#A8192E] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : content?.content ? (
            <DraftContent raw={content.content} />
          ) : (
            <p className="text-sm text-[#2C1A0E]/50">Nothing drafted yet for this stage.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function ApplicationCard({
  app,
  expanded,
  onToggle,
  hasContent,
  onViewDraft,
  chat,
  activity,
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
  const timeline = useMemo(() => {
    const items = [
      ...chat.map((m: ChatMessage) => ({ kind: 'chat' as const, ts: m.created_at, role: m.role, message: m.message })),
      ...activity.map((a: AgentStep) => ({ kind: 'activity' as const, ts: a.timestamp, action: a.action, extra_data: a.extra_data })),
    ]
    return items.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
  }, [chat, activity])
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

          {/* Draft access */}
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-bold uppercase tracking-wide text-[#2C1A0E]/50">Activity</h5>
            {hasContent && (
              <button
                onClick={onViewDraft}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#A8192E] hover:underline"
              >
                <span className="material-symbols-outlined text-base">description</span>
                View Draft
              </button>
            )}
          </div>

          {/* Merged chat + agent telemetry timeline */}
          <div>
            <div className="space-y-2 max-h-72 overflow-y-auto mb-3">
              {loadingChat ? (
                <div className="flex justify-center py-4">
                  <div className="w-5 h-5 border-2 border-[#A8192E] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : timeline.length === 0 ? (
                <p className="text-sm text-[#2C1A0E]/50 py-2">No activity yet — ask the agent to change the headline, tone, a budget line, etc.</p>
              ) : (
                timeline.map((item: any, i: number) =>
                  item.kind === 'activity' ? (
                    <div key={i} className="flex items-center gap-2 text-xs text-[#2C1A0E]/50 py-0.5">
                      <span className="material-symbols-outlined text-sm text-[#A8192E]/60 flex-shrink-0">bolt</span>
                      <span className="truncate">{item.action}</span>
                    </div>
                  ) : (
                    <div key={i} className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-xl px-3.5 py-2 text-sm ${
                        item.role === 'user'
                          ? 'bg-[#1C1C1C] text-[#FDFAF4]'
                          : 'bg-[#1C1C1C]/5 text-[#1C1C1C]'
                      }`}>
                        {item.message}
                      </div>
                    </div>
                  )
                )
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
              <div className="flex flex-col gap-2">
                <button
                  onClick={onSubmit}
                  disabled={actionLoading}
                  className={`px-4 py-2 bg-[#1C1C1C] text-[#FDFAF4] rounded-lg text-sm font-semibold hover:bg-[#1C1C1C]/85 transition-all disabled:opacity-50 ${OFFSET_BTN}`}
                >
                  Submit Application
                </button>
                <p className="text-xs text-[#2C1A0E]/70 bg-[#F5F0E8] p-2.5 rounded-lg border border-[#1C1C1C]/10">
                  ℹ️ <strong>Submission Mode:</strong> Please check the official{' '}
                  {app.grant_link ? (
                    <a href={app.grant_link} target="_blank" rel="noopener noreferrer" className="text-[#A8192E] font-bold underline">
                      grant link
                    </a>
                  ) : (
                    'grant details'
                  )}{' '}
                  to follow the granter's exact submission mode (portal upload, email, or online form) using your downloaded proposal.
                </p>
              </div>
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
              <div className="space-y-2">
                <span className="text-sm text-[#1C1C1C] flex items-center gap-2 font-medium">
                  <span className="material-symbols-outlined text-lg text-[#A8192E]">check_circle</span>
                  Submitted on {formatDate(app.submitted_at)}
                </span>
                {app.grant_link && (
                  <p className="text-xs text-[#2C1A0E]/70 bg-[#F5F0E8] p-2.5 rounded-lg border border-[#1C1C1C]/10">
                    ℹ️ Verify submission status on the{' '}
                    <a href={app.grant_link} target="_blank" rel="noopener noreferrer" className="text-[#A8192E] font-bold underline">
                      official grant portal
                    </a>.
                  </p>
                )}
              </div>
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
  const [viewingDraft, setViewingDraft] = useState(false)

  const [chat, setChat] = useState<ChatMessage[]>([])
  const [loadingChat, setLoadingChat] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [sendingChat, setSendingChat] = useState(false)
  const [activity, setActivity] = useState<AgentStep[]>([])
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchApplications()
  }, [])

  useEffect(() => {
    if (expandedId) {
      fetchContent(expandedId)
      fetchChat(expandedId)
      fetchActivity(expandedId)
    }
  }, [expandedId])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat, activity])

  // poll while any application has an active background job, since
  // approve-outline/apply return immediately instead of waiting for it
  useEffect(() => {
    const hasInProgress = applications.some(a => IN_PROGRESS_STATUSES.includes(a.status))
    if (!hasInProgress) return
    const interval = setInterval(() => {
      fetchApplications()
      if (expandedId) fetchActivity(expandedId)
    }, 4000)
    return () => clearInterval(interval)
  }, [applications, expandedId])

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

  async function fetchActivity(id: string) {
    try {
      const res = await api.get(`/hub/${id}/activity`)
      setActivity(res.data || [])
    } catch (err) {
      console.error('Failed to fetch activity:', err)
    }
  }

  function toggle(id: string) {
    setExpandedId(prev => (prev === id ? null : id))
    setViewingDraft(false)
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
      fetchActivity(expandedId)
      fetchContent(expandedId)
    } catch (err) {
      console.error('Failed to send chat:', err)
    } finally {
      setSendingChat(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">

      <p className="text-sm text-[#2C1A0E]/60 mb-6">
        Review and manage multi-agent application workflows.
        Approve outlines and proposals, chat through revisions, and track submissions
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
              hasContent={expandedId === app.id && !!content?.content}
              onViewDraft={() => setViewingDraft(true)}
              chat={expandedId === app.id ? chat : []}
              activity={expandedId === app.id ? activity : []}
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

      {viewingDraft && expandedId && (
        <DraftModal
          app={applications.find(a => a.id === expandedId)}
          content={content}
          loadingContent={loadingContent}
          onClose={() => setViewingDraft(false)}
        />
      )}
    </div>
  )
}
