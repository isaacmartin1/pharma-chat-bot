'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { GoogleLogin } from '@react-oauth/google'
import { register } from '@/lib/api'

async function handleGoogleCredential(credential: string, router: ReturnType<typeof useRouter>) {
  const res = await fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Google sign-in failed')
  }
  const data = await res.json()
  localStorage.setItem('pharma_token', data.access_token)
  router.replace('/chat')
}

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [companySlug, setCompanySlug] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name.trim() || !email.trim() || !password.trim() || !companyName.trim() || !companySlug.trim()) {
      setError('All fields are required')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setIsLoading(true)
    try {
      const { token } = await register(email.trim(), password, name.trim(), companyName.trim(), companySlug.trim())
      localStorage.setItem('pharma_token', token)
      router.replace('/chat')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-purple text-white mb-4">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-brand-navy">PharmaAssets</h1>
          <p className="text-sm text-gray-500 mt-1">Create your account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-center mb-4">
            <GoogleLogin
              onSuccess={async (res) => {
                try {
                  await handleGoogleCredential(res.credential!, router)
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Google sign-in failed')
                }
              }}
              onError={() => setError('Google sign-in failed')}
              theme="outline"
              shape="rectangular"
              text="signup_with"
              width="100%"
            />
          </div>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-white text-gray-400">or create account with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-purple/50 focus:border-brand-purple transition-colors"
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-purple/50 focus:border-brand-purple transition-colors"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={8}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-purple/50 focus:border-brand-purple transition-colors"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => {
                  setCompanyName(e.target.value)
                  if (!companySlug) {
                    setCompanySlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''))
                  }
                }}
                required
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-purple/50 focus:border-brand-purple transition-colors"
                placeholder="Acme Pharmaceuticals"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Company Slug</label>
              <input
                type="text"
                value={companySlug}
                onChange={(e) => setCompanySlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                required
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-purple/50 focus:border-brand-purple transition-colors"
                placeholder="acme-pharma"
              />
              <p className="text-xs text-gray-400 mt-1">Unique identifier — lowercase letters, numbers, hyphens only</p>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-brand-purple text-white text-sm font-medium rounded-lg hover:bg-brand-purple/90 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-brand-purple font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
