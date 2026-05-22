'use client'

import { useState } from 'react'
import type { Session, User } from '@/lib/types'

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

interface Props {
  sessions: Session[]
  currentSessionId: string | null
  user: User | null
  onNewChat: () => void
  onSelectSession: (id: string) => void
  onDeleteSession: (id: string) => void
  onLogout: () => void
}

export function Sidebar({
  sessions,
  currentSessionId,
  user,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onLogout,
}: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  return (
    <div className="flex flex-col h-full bg-brand-navy text-white">
      <div className="px-4 py-4 flex-shrink-0">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-brand-purple flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span className="text-sm font-semibold">PharmaAssets</span>
        </div>
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-brand-purple text-white text-sm font-medium rounded-lg hover:bg-brand-purple/90 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {sessions.length === 0 && (
          <p className="text-xs text-white/40 px-2 py-2">No sessions yet</p>
        )}
        {sessions.map((session) => {
          const isActive = session.id === currentSessionId
          const isHovered = hoveredId === session.id
          return (
            <div
              key={session.id}
              onMouseEnter={() => setHoveredId(session.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`group relative flex items-center rounded-lg cursor-pointer transition-colors ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
              onClick={() => onSelectSession(session.id)}
            >
              <div className="flex-1 min-w-0 px-3 py-2.5">
                <p className="text-sm truncate leading-tight">
                  {session.title || 'Untitled session'}
                </p>
                <p className="text-xs opacity-50 mt-0.5">
                  {formatRelativeTime(session.updated_at)}
                </p>
              </div>
              {isHovered && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteSession(session.id)
                  }}
                  className="flex-shrink-0 p-1.5 mr-1.5 rounded hover:bg-red-500/30 hover:text-red-300 text-white/40 transition-colors"
                  title="Delete session"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                  </svg>
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex-shrink-0 border-t border-white/10 px-3 py-3">
        {user && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-brand-purple/60 flex items-center justify-center flex-shrink-0 text-xs font-semibold">
              {(user.name?.[0] || user.email?.[0])?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user.name || user.email}</p>
              <p className="text-xs text-white/40 truncate">{user.email}</p>
            </div>
            <button
              onClick={onLogout}
              className="flex-shrink-0 p-1 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors"
              title="Log out"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
