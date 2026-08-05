'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import api from '@/lib/api'
import { ActiveRun, HistoryRun, AgentStep } from '@/lib/types'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { OFFSET, OFFSET_BTN } from '@/lib/theme'

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-[#1C1C1C]/5 text-[#2C1A0E]/60',
  running: 'bg-[#A8192E]/10 text-[#A8192E]',
  done: 'bg-[#1C1C1C]/10 text-[#1C1C1C]',
  failed: 'bg-[#A8192E]/10 text-[#A8192E]',
  cancelled: 'bg-[#1C1C1C]/5 text-[#2C1A0E]/60',
}

function formatAction(action: string) {
  return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatTime(ts: string) {
  const d = new Date(ts)
  return isNaN(d.getTime()) ? ts : d.toLocaleString()
}

export default function AgentsPage() {
  const [activeRuns, setActiveRuns] = useState<ActiveRun[]>([])
  const [history, setHistory] = useState<HistoryRun[]>([])
  const [loadingRuns, setLoadingRuns] = useState(true)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [steps, setSteps] = useState<AgentStep[]>([])
  const [loadingSteps, setLoadingSteps] = useState(false)
  const [triggering, setTriggering] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const selectedRunIdRef = useRef<string | null>(null)

  useEffect(() => {
    selectedRunIdRef.current = selectedRunId
  }, [selectedRunId])

  const fetchRuns = useCallback(async () => {
    try {
      const [progressRes, historyRes] = await Promise.all([
        api.get('/agents/progress'),
        api.get('/agents/history'),
      ])
      setActiveRuns(progressRes.data.active || [])
      setHistory(historyRes.data || [])
    } catch (err) {
      console.error('Failed to fetch agent runs:', err)
    } finally {
      setLoadingRuns(false)
    }
  }, [])

  const fetchSteps = useCallback(async (runId: string) => {
    setLoadingSteps(true)
    try {
      const res = await api.get(`/agents/${runId}/steps`)
      setSteps(res.data || [])
    } catch (err) {
      console.error('Failed to fetch run steps:', err)
    } finally {
      setLoadingSteps(false)
    }
  }, [])

  useEffect(() => {
    fetchRuns()
  }, [fetchRuns])

  useEffect(() => {
    if (selectedRunId) fetchSteps(selectedRunId)
  }, [selectedRunId, fetchSteps])

  // poll while there are active runs, to keep the log/status feeling live
  useEffect(() => {
    if (activeRuns.length === 0) return
    const interval = setInterval(() => {
      fetchRuns()
      if (selectedRunIdRef.current) fetchSteps(selectedRunIdRef.current)
    }, 4000)
    return () => clearInterval(interval)
  }, [activeRuns.length, fetchRuns, fetchSteps])

  async function handleTrigger() {
    setTriggering(true)
    try {
      const res = await api.post('/agent/trigger')
      await fetchRuns()
      if (res.data?.run_id) setSelectedRunId(res.data.run_id)
    } catch (err) {
      console.error('Failed to trigger agent:', err)
    } finally {
      setTriggering(false)
    }
  }

  async function handleCancel(runId: string) {
    setCancelling(true)
    try {
      await api.post(`/agent/${runId}/cancel`)
      await fetchRuns()
    } catch (err) {
      console.error('Failed to cancel run:', err)
    } finally {
      setCancelling(false)
    }
  }

  const allRuns = [
    ...activeRuns.map(r => ({ ...r, isActive: true })),
    ...history.map(r => ({ ...r, isActive: false, current_step: null, step_extradata: null })),
  ]

  const selectedIsActive = activeRuns.some(r => r.run_id === selectedRunId)

  return (
    <div className="max-w-7xl mx-auto">

      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <p className="text-sm text-[#2C1A0E]/60">
          Track grant discovery runs and agent activity in real time
        </p>
        <button
          onClick={handleTrigger}
          disabled={triggering}
          className={`flex items-center gap-2 px-4 py-2 bg-[#A8192E] text-[#FDFAF4] rounded-lg text-sm font-semibold hover:bg-[#8f1526] transition-all disabled:opacity-50 ${OFFSET_BTN}`}
        >
          <span className="material-symbols-outlined text-xl">
            {triggering ? 'hourglass_top' : 'play_arrow'}
          </span>
          {triggering ? 'Starting...' : 'Trigger Discovery'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">

        {/* Run list */}
        <aside className={`bg-[#FDFAF4] border border-[#1C1C1C]/10 rounded-xl overflow-hidden h-fit ${OFFSET}`}>
          {activeRuns.length > 0 && (
            <div className="px-4 pt-4 pb-1 text-xs font-semibold text-[#2C1A0E]/50 uppercase tracking-wide">
              Active
            </div>
          )}
          {loadingRuns ? (
            <div className="p-6 flex justify-center">
              <div className="w-6 h-6 border-2 border-[#A8192E] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : allRuns.length === 0 ? (
            <div className="p-6 text-center text-sm text-[#2C1A0E]/50">
              No agent runs yet. Trigger discovery to get started.
            </div>
          ) : (
            <div className="divide-y divide-[#1C1C1C]/8">
              {allRuns.map((run, i) => {
                const isFirstHistory = !run.isActive && i === activeRuns.length
                return (
                  <div key={run.run_id}>
                    {isFirstHistory && (
                      <div className="px-4 pt-3 pb-1 text-xs font-semibold text-[#2C1A0E]/50 uppercase tracking-wide bg-[#1C1C1C]/[0.03]">
                        History
                      </div>
                    )}
                    <button
                      onClick={() => setSelectedRunId(run.run_id)}
                      className={`w-full text-left px-4 py-3 hover:bg-[#1C1C1C]/[0.03] transition-colors ${
                        selectedRunId === run.run_id ? 'bg-[#1C1C1C]/[0.03]' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono text-[#2C1A0E]/50">
                          {run.run_id.slice(0, 8)}
                        </span>
                        <StatusBadge
                          status={run.status}
                          styles={STATUS_STYLES}
                          indicator={run.status === 'running' ? 'pulse' : 'none'}
                        />
                      </div>
                      {run.isActive && run.current_step && (
                        <p className="text-xs text-[#A8192E] truncate">{formatAction(run.current_step)}</p>
                      )}
                      <p className="text-xs text-[#2C1A0E]/50 mt-0.5">{formatTime(run.triggered_at)}</p>
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </aside>

        {/* Run detail / log */}
        <div className={`bg-[#1C1C1C] rounded-xl overflow-hidden flex flex-col min-h-[420px] ${OFFSET}`}>
          {!selectedRunId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-white/50 py-24">
              <span className="material-symbols-outlined text-5xl mb-3">smart_toy</span>
              <p className="text-sm">Select a run to view its activity log</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${selectedIsActive ? 'bg-[#A8192E] animate-pulse' : 'bg-white/30'}`} />
                  <span className="font-mono text-sm text-white">{selectedRunId}</span>
                </div>
                {selectedIsActive && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-white/60">Live</span>
                    <button
                      onClick={() => handleCancel(selectedRunId)}
                      disabled={cancelling}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#A8192E]/20 text-[#ff8a97] rounded-lg text-xs font-medium hover:bg-[#A8192E]/30 transition-colors disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-sm">stop_circle</span>
                      {cancelling ? 'Stopping...' : 'Stop'}
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-5 font-mono text-xs space-y-3 max-h-[520px]">
                {loadingSteps ? (
                  <div className="text-white/40">Loading activity...</div>
                ) : steps.length === 0 ? (
                  <div className="text-white/40">No activity recorded for this run yet.</div>
                ) : (
                  steps.map((step, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="text-white/30 whitespace-nowrap">
                        {new Date(step.timestamp).toLocaleTimeString()}
                      </span>
                      <span className={step.actor === 'agent' ? 'text-[#ff8a97]' : 'text-[#FDFAF4]/70'}>
                        [{step.actor.toUpperCase()}]
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-white">{formatAction(step.action)}</span>
                        {step.extra_data && (
                          <div className="text-white/40 truncate">
                            {JSON.stringify(step.extra_data)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
