'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import api from '@/lib/api'
import { OFFSET, OFFSET_BTN } from '@/lib/theme'
import TelumaLogo from '@/components/Logo'

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [areaOfFocus, setAreaOfFocus] = useState('')
  const [organizationType, setOrganizationType] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          organization_type: organizationType,
          area_of_focus: areaOfFocus
        },
        // without this, Supabase falls back to the project's "Site URL" —
        // which is whatever it was set to at project creation, almost
        // certainly still localhost. This makes it follow wherever the
        // signup actually happened instead.
        emailRedirectTo: `${window.location.origin}/login`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data.session) {
      try {
        await api.post('/user/me')
      } catch (err) {
        console.error('Failed to sync profile:', err)
      }
      router.push('/feed')
      return
    }

    // no session yet means Supabase is waiting on email confirmation
    setConfirmationSent(true)
    setLoading(false)
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

        {confirmationSent ? (
          <>
            <h2 className="text-2xl font-black text-[#1C1C1C] mb-3">Check your inbox</h2>
            <p className="text-sm text-[#2C1A0E]/60 mb-6">
              We sent a confirmation link to <span className="font-semibold text-[#1C1C1C]">{email}</span>.
              Confirm your email to finish creating your account.
            </p>
            <a
              href="/login"
              className={`block text-center w-full bg-[#A8192E] text-[#FDFAF4] rounded-lg py-2.5 font-semibold text-sm hover:bg-[#8f1526] transition-all ${OFFSET_BTN}`}
            >
              Back to Sign In
            </a>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-black text-[#1C1C1C] mb-6">Create your account</h2>

            {error && (
              <div className="bg-[#A8192E]/10 text-[#A8192E] text-sm rounded-lg px-4 py-3 mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#2C1A0E]/70 mb-1">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full border border-[#1C1C1C]/15 rounded-lg px-4 py-2.5 text-sm bg-[#F5F0E8] text-[#1C1C1C] focus:outline-none focus:border-[#A8192E]/50"
                  placeholder="Enter name of organization"
                  required
                />
              </div>
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
                  minLength={6}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#2C1A0E]/70 mb-1">
                  Organization Type
                </label>
                <select
                  value={organizationType}
                  onChange={(e) => setOrganizationType(e.target.value)}
                  className="w-full border border-[#1C1C1C]/15 rounded-lg px-4 py-2.5 text-sm bg-[#F5F0E8] text-[#1C1C1C] focus:outline-none focus:border-[#A8192E]/50 cursor-pointer"
                  required
                >
                  <option value="" disabled>
                    Select organization type...
                  </option>
                  <option value="Non-profit/NGO">Non-Profit / NGO</option>
                  <option value="Academic Institution">Academic Institution</option>
                  <option value="Early-stage Startup">Early-Stage Startup</option>
                  <option value="SME">SME Business</option>
                  <option value="Independent Specialist">Independent Consultant / Specialist</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#2C1A0E]/70 mb-1">
                  Area of Focus
                </label>
                <input
                  type="areaOfFocus"
                  value={areaOfFocus}
                  onChange={(e) => setAreaOfFocus(e.target.value)}
                  className="w-full border border-[#1C1C1C]/15 rounded-lg px-4 py-2.5 text-sm bg-[#F5F0E8] text-[#1C1C1C] focus:outline-none focus:border-[#A8192E]/50"
                  placeholder="e.g., Healthcare, Civic Tech, Education, AI, Climate"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full bg-[#A8192E] text-[#FDFAF4] rounded-lg py-2.5 font-semibold text-sm hover:bg-[#8f1526] transition-all disabled:opacity-50 ${OFFSET_BTN}`}
              >
                {loading ? 'Creating account...' : 'Sign Up'}
              </button>
            </form>

            <p className="text-center text-sm text-[#2C1A0E]/60 mt-6">
              Already have an account?{' '}
              <a href="/login" className="text-[#A8192E] font-semibold hover:underline">
                Sign in
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
