'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { OFFSET, OFFSET_BTN } from '@/lib/theme'
import TelumaLogo from '@/components/Logo'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center px-4">
      <div className={`bg-[#FDFAF4] border border-[#1C1C1C]/10 rounded-2xl p-8 w-full max-w-md ${OFFSET}`}>
        <div className="flex items-center gap-3 mb-8">
          <TelumaLogo size={40} />
          <div>
            <h1 className="font-bold text-xl text-[#1C1C1C]">Teluma</h1>
            <p className="text-xs text-[#2C1A0E]/60">Unlocking Non-Dilutive Capital on Autopilot</p>
          </div>
        </div>

        <h2 className="text-2xl font-black text-[#1C1C1C] mb-6">Welcome back</h2>

        {error && (
          <div className="bg-[#A8192E]/10 text-[#A8192E] text-sm rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#2C1A0E]/70 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-[#1C1C1C]/15 rounded-lg px-4 py-2.5 text-sm bg-[#F5F0E8] text-[#1C1C1C] focus:outline-none focus:border-[#A8192E]/50"
              placeholder="you@organization.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#2C1A0E]/70 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-[#1C1C1C]/15 rounded-lg px-4 py-2.5 text-sm bg-[#F5F0E8] text-[#1C1C1C] focus:outline-none focus:border-[#A8192E]/50"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-[#A8192E] text-[#FDFAF4] rounded-lg py-2.5 font-semibold text-sm hover:bg-[#8f1526] transition-all disabled:opacity-50 ${OFFSET_BTN}`}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-[#2C1A0E]/60 mt-6">
          Don't have an account?{' '}
          <a href="/signup" className="text-[#A8192E] font-semibold hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </div>
  )
}
