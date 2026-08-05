'use client'
import { useEffect, useRef, useState } from 'react'
import api from '@/lib/api'
import { AppNotification } from '@/lib/types'
import { OFFSET } from '@/lib/theme'

const TYPE_ICON: Record<string, string> = {
  success: 'check_circle',
  failure: 'error',
  info: 'info',
}

const TYPE_COLOR: Record<string, string> = {
  success: 'text-[#1C1C1C]',
  failure: 'text-[#A8192E]',
  info: 'text-[#2C1A0E]/60',
}

function timeAgo(ts: string): string {
  const diffMs = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function fetchUnreadCount() {
    try {
      const res = await api.get('/notifications/unread-count')
      setUnreadCount(res.data.count)
    } catch (err) {
      console.error('Failed to fetch unread count:', err)
    }
  }

  async function fetchNotifications() {
    setLoading(true)
    try {
      const res = await api.get('/notifications/')
      setNotifications(res.data || [])
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  async function toggleOpen() {
    const next = !open
    setOpen(next)
    if (next) await fetchNotifications()
  }

  async function markAllRead() {
    try {
      await api.post('/notifications/read-all')
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Failed to mark all read:', err)
    }
  }

  async function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    setUnreadCount((c) => Math.max(0, c - 1))
    try {
      await api.post(`/notifications/${id}/read`)
    } catch (err) {
      console.error('Failed to mark notification read:', err)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggleOpen}
        className="rounded-full p-2 text-[#2C1A0E]/60 hover:bg-[#1C1C1C]/5 relative"
      >
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#A8192E] rounded-full"></span>
        )}
      </button>

      {open && (
        <div className={`absolute right-0 top-12 w-80 max-h-96 overflow-y-auto bg-[#FDFAF4] border border-[#1C1C1C]/10 rounded-xl z-50 ${OFFSET}`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1C1C1C]/8">
            <h4 className="text-sm font-bold text-[#1C1C1C]">Notifications</h4>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs font-medium text-[#A8192E] hover:underline">
                Mark all read
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-[#A8192E] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-[#2C1A0E]/50 text-center py-8">You're all caught up.</p>
          ) : (
            <div className="divide-y divide-[#1C1C1C]/8">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.read && markRead(n.id)}
                  className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-[#1C1C1C]/[0.02] transition-colors ${!n.read ? 'bg-[#A8192E]/[0.04]' : ''}`}
                >
                  <span className={`material-symbols-outlined text-lg flex-shrink-0 mt-0.5 ${TYPE_COLOR[n.type] || TYPE_COLOR.info}`}>
                    {TYPE_ICON[n.type] || TYPE_ICON.info}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#1C1C1C]">{n.title}</p>
                    {n.message && <p className="text-xs text-[#2C1A0E]/60 mt-0.5">{n.message}</p>}
                    <p className="text-[11px] text-[#2C1A0E]/40 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-[#A8192E] flex-shrink-0 mt-1.5" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
