'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { DashboardData } from '@/lib/types'
import { StatTile } from '@/components/ui/StatTile'
import { OFFSET, OFFSET_HOVER, OFFSET_BTN } from '@/lib/theme'

function StorageTile({ storage }: { storage: DashboardData['storage'] }) {
  const percent = Math.round((storage.used_bytes / storage.limit_bytes) * 100)
  return (
    <div className={`bg-[#FDFAF4] border border-[#1C1C1C]/10 rounded-xl p-4 ${OFFSET}`}>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-lg bg-[#1C1C1C]/5 flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-[#A8192E] text-lg">database</span>
        </div>
        <div>
          <div className="text-xl font-bold text-[#1C1C1C] leading-tight">{storage.used_mb.toFixed(0)}MB</div>
          <div className="text-xs text-[#2C1A0E]/60">of {storage.limit_mb.toFixed(0)}MB used</div>
        </div>
      </div>
      <div className="w-full bg-[#1C1C1C]/10 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all ${percent > 80 ? 'bg-[#A8192E]' : 'bg-[#1C1C1C]'}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)
  const [showToast, setShowToast] = useState(false)

  useEffect(() => {
    fetchDashboard()
  }, [])

  async function fetchDashboard() {
    try {
      const res = await api.get('/dashboard/')
      setData(res.data)
    } catch (err) {
      console.error('Failed to fetch dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleTrigger() {
    setTriggering(true)
    try {
      await api.post('/agent/trigger')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 8000)
    } catch (err) {
      console.error('Failed to trigger discovery:', err)
    } finally {
      setTriggering(false)
    }
  }

  const pendingCount = data?.stats.applications_pending ?? 0

  return (
    <div className="max-w-6xl mx-auto">

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <p className="text-sm text-[#2C1A0E]/60">
          {loading ? '' : `Welcome back${data?.user.full_name ? `, ${data.user.full_name}` : ''} — here's what's happening with your grants`}
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

      {showToast && (
        <div className={`flex items-center gap-3 bg-[#1C1C1C] text-[#FDFAF4] rounded-xl px-4 py-3 mb-6 ${OFFSET}`}>
          <span className="material-symbols-outlined text-[#FDFAF4]/70">smart_toy</span>
          <p className="text-sm flex-1">Discovery started — find newly discovered grants on your Feed soon.</p>
          <Link href="/feed" className="text-sm font-semibold underline flex-shrink-0">Go to Feed</Link>
          <button onClick={() => setShowToast(false)} className="text-[#FDFAF4]/50 hover:text-[#FDFAF4] flex-shrink-0">
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
          Couldn't load your dashboard.
        </div>
      ) : (
        <div className="space-y-6">

          {/* Stats — 5 tiles, storage included in the same row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatTile label="Total Grants" value={data.stats.total_grants} icon="query_stats" />
            <StatTile label="Applications Pending" value={data.stats.applications_pending} icon="hourglass_top" />
            <StatTile label="Applications Submitted" value={data.stats.applications_submitted} icon="check_circle" />
            <StatTile label="Vault Documents" value={data.stats.vault_documents} icon="inventory_2" />
            <StorageTile storage={data.storage} />
          </div>

          {/* Needs Your Attention */}
          <div>
            <h3 className="text-sm font-semibold text-[#1C1C1C] mb-3">Needs Your Attention</h3>
            {pendingCount > 0 ? (
              <Link
                href="/hub"
                className={`flex items-center gap-4 bg-[#FDFAF4] border border-[#1C1C1C]/10 rounded-xl p-4 ${OFFSET} ${OFFSET_HOVER} transition-shadow`}
              >
                <div className="w-11 h-11 rounded-lg bg-[#A8192E]/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-[#A8192E] text-xl">hourglass_top</span>
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-[#1C1C1C]">
                    {pendingCount} pending application{pendingCount > 1 ? 's' : ''} in the Hub
                  </h4>
                  <p className="text-xs text-[#2C1A0E]/50">Ready to review and submit</p>
                </div>
                <span className="material-symbols-outlined text-[#2C1A0E]/40 ml-auto flex-shrink-0">chevron_right</span>
              </Link>
            ) : (
              <div className={`flex items-center gap-4 bg-[#FDFAF4] border border-[#1C1C1C]/10 rounded-xl p-4 ${OFFSET}`}>
                <div className="w-11 h-11 rounded-lg bg-[#1C1C1C]/5 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-[#1C1C1C] text-xl">check_circle</span>
                </div>
                <h4 className="text-sm font-semibold text-[#1C1C1C]">You're all caught up with your applications</h4>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
