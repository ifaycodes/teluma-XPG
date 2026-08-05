'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import api from '@/lib/api'
import { NotificationBell } from '@/components/ui/NotificationBell'
import { PlanPickerModal } from '@/components/ui/PlanPickerModal'

const navItems = [
  { href: '/feed', label: 'Feed', icon: 'rss_feed' },
  { href: '/vault', label: 'Vault', icon: 'inventory_2' },
  { href: '/hub', label: 'Hub', icon: 'hub' },
]

const secondaryNavItems = [
  { href: '/settings', label: 'Settings', icon: 'settings' },
  { href: '/support', label: 'Support', icon: 'help' },
]

const PAGE_TITLES: [string, string][] = [
  ['/feed', 'Grant Intelligence Feed'],
  ['/vault', 'Institutional Vault'],
  ['/agents', 'Agent Monitor'],
  ['/hub', 'Application Hub'],
  ['/settings', 'Settings'],
  ['/support', 'Support'],
  ['/dashboard', 'Dashboard'],
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [pinned, setPinned] = useState(false)
  const [hovering, setHovering] = useState(false)
  const [planSelected, setPlanSelected] = useState<boolean | null>(null)
  const expanded = pinned || hovering
  const pageTitle = PAGE_TITLES.find(([path]) => pathname.startsWith(path))?.[1] ?? ''

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.push('/login')
        return
      }
      setUser(data.session.user)
      // idempotent — creates the public.users row on whichever page first
      // sees an authenticated session (fresh signup, confirmed-email
      // redirect, or a plain login all land here eventually)
      try {
        const res = await api.post('/user/me')
        setPlanSelected(!!res.data.plan_selected)
      } catch (err) {
        console.error('Failed to sync profile:', err)
      }
    })
  }, [])

  async function handleSignOut() {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Sign out request failed:', err)
    } finally {
      router.push('/login')
    }
  }

  function closeSidebar() {
    setPinned(false)
    setHovering(false)
  }

  const labelClass = `overflow-hidden whitespace-nowrap transition-opacity duration-200 ${
    expanded ? 'opacity-100' : 'opacity-0'
  }`

  const SidebarContent = () => (
    <>
      <button
        onClick={() => setPinned((p) => !p)}
        className="mb-10 flex items-center gap-3 w-full"
      >
        <div className="w-10 h-10 rounded-lg bg-[#A8192E] flex items-center justify-center flex-shrink-0">
          <span className="text-[#FDFAF4] font-bold text-lg">T</span>
        </div>
        <div className={`text-left ${labelClass}`}>
          <h1 className="font-bold text-lg text-[#FDFAF4] whitespace-nowrap">Teluma</h1>
          <p className="text-xs text-[#FDFAF4]/50 whitespace-nowrap">Strategic Impact</p>
        </div>
      </button>

      <nav className="flex-1 space-y-1 w-full">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg font-medium text-sm transition-all ${
                active
                  ? 'text-[#FDFAF4] font-bold bg-[#A8192E]'
                  : 'text-[#FDFAF4]/60 hover:text-[#FDFAF4] hover:bg-white/5'
              }`}
            >
              <span className="material-symbols-outlined flex-shrink-0">{item.icon}</span>
              <span className={labelClass}>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <nav className="space-y-1 pt-4 mt-4 border-t border-white/10 w-full">
        {secondaryNavItems.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all ${
                active
                  ? 'text-[#FDFAF4] bg-[#A8192E]'
                  : 'text-[#FDFAF4]/60 hover:text-[#FDFAF4] hover:bg-white/5'
              }`}
            >
              <span className="material-symbols-outlined text-xl flex-shrink-0">{item.icon}</span>
              <span className={labelClass}>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto pt-6 border-t border-white/10 w-full">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-3 rounded-lg text-[#FDFAF4]/60 hover:text-[#FDFAF4] hover:bg-white/5 transition-all w-full text-sm"
        >
          <span className="material-symbols-outlined flex-shrink-0">logout</span>
          <span className={labelClass}>Sign Out</span>
        </button>
      </div>
    </>
  )

  return (
    <div className="bg-[#F5F0E8] min-h-screen">

      {/* Sidebar — desktop only. Collapses to an icon rail; hover or click the
          logo to unfold it as an overlay. Clicking a nav link closes it immediately. */}
      <aside
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        className={`hidden lg:flex fixed left-0 top-0 h-screen bg-[#1C1C1C] flex-col py-6 px-3 z-50 overflow-hidden transition-[width] duration-200 ${
          expanded ? 'w-52' : 'w-[72px]'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Topbar */}
      <header className="fixed top-0 right-0 left-0 lg:left-[72px] h-16 bg-[#F5F0E8] border-b border-[#1C1C1C]/10 flex justify-between items-center px-4 lg:px-10 z-40">
        {pageTitle ? (
          <h2 className="text-lg font-black text-[#1C1C1C]">{pageTitle}</h2>
        ) : <div />}
        <div className="flex items-center gap-2 flex-shrink-0">
          <NotificationBell />
          <button
            onClick={() => router.push('/dashboard')}
            className="rounded-full hover:bg-[#1C1C1C]/5 transition-colors p-0.5"
          >
            <div className="w-8 h-8 rounded-full bg-[#FDFAF4] flex items-center justify-center text-sm font-bold text-[#A8192E] border border-[#1C1C1C]/10">
              {user?.email?.[0]?.toUpperCase()}
            </div>
          </button>
        </div>
      </header>

      {/* Page Content */}
      <main className="lg:ml-[72px] mt-16 mb-16 lg:mb-0 p-4 lg:p-6 min-h-[calc(100vh-64px)] bg-[#F5F0E8]">
        {children}
      </main>

      {/* Bottom Nav — mobile & tablet only */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#1C1C1C] flex items-center justify-around px-1 z-40 lg:hidden">
        {[...navItems, ...secondaryNavItems].map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-colors ${
                active ? 'text-[#FDFAF4]' : 'text-[#FDFAF4]/50'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              <span className="text-[9px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {planSelected === false && (
        <PlanPickerModal onResolved={() => setPlanSelected(true)} />
      )}

    </div>
  )
}
