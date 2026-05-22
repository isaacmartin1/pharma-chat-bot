'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const contentTypes = [
  {
    key: 'email',
    label: 'Email',
    emoji: '📧',
    description: 'Targeted HCP or patient emails with compliant messaging and clear CTAs.',
  },
  {
    key: 'banner',
    label: 'Banner Ad',
    emoji: '🖼️',
    description: 'Digital display banners sized for web and programmatic campaigns.',
  },
  {
    key: 'social',
    label: 'Social Post',
    emoji: '📱',
    description: 'Platform-ready social content for LinkedIn, Twitter, and more.',
  },
  {
    key: 'slide',
    label: 'Slide Deck',
    emoji: '📊',
    description: 'Structured slide presentations for MSL, sales, or congress use.',
  },
]

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('pharma_token')
    if (!token) {
      router.replace('/login')
    }
  }, [router])

  const handleSelect = (key: string) => {
    router.push(`/chat?type=${key}`)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F8F9FB' }}>
      {/* Header */}
      <header className="px-8 py-4 flex items-center justify-between border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: '#1B2A4A' }}
          >
            P
          </div>
          <span className="font-semibold text-sm" style={{ color: '#1B2A4A' }}>
            PharmaAsset AI
          </span>
        </div>
        <button
          onClick={() => {
            localStorage.removeItem('pharma_token')
            router.replace('/login')
          }}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Sign out
        </button>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="text-center mb-12 max-w-xl">
          <h1 className="text-4xl font-bold mb-3" style={{ color: '#1B2A4A' }}>
            PharmaAsset AI
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed">
            FDA-compliant pharmaceutical marketing content generation
          </p>
        </div>

        {/* Content Type Grid */}
        <div className="grid grid-cols-2 gap-5 w-full max-w-2xl">
          {contentTypes.map((ct) => (
            <button
              key={ct.key}
              onClick={() => handleSelect(ct.key)}
              className="group bg-white rounded-2xl border border-gray-200 p-6 text-left shadow-sm hover:shadow-md transition-all hover:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <div className="text-3xl mb-3">{ct.emoji}</div>
              <h3
                className="text-base font-semibold mb-1 group-hover:text-purple-700 transition-colors"
                style={{ color: '#1B2A4A' }}
              >
                {ct.label}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">{ct.description}</p>
            </button>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center">
        <p className="text-xs text-gray-400">
          Powered by Claude AI &middot; PharmaAsset AI
        </p>
      </footer>
    </div>
  )
}
