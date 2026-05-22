'use client'

import { useEffect } from 'react'

interface Props {
  assetHtml: string
  onClose: () => void
}

export function AssetModal({ assetHtml, onClose }: Props) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl flex flex-col"
        style={{ width: '90vw', height: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-800">Email Preview</h2>
          <button
            onClick={onClose}
            aria-label="Close preview"
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            style={{ color: '#8C4799' }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <iframe
            title="Asset Preview"
            srcDoc={assetHtml}
            className="w-full h-full rounded-b-2xl border-0"
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  )
}
