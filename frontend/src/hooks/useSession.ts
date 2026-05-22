'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Session } from '@/lib/types'
import { getSessions, createSession, deleteSession } from '@/lib/api'

export function useSession() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getSessions()
      .then((data) => {
        if (!cancelled) {
          setSessions(data)
          setIsLoading(false)
        }
      })
      .catch((err) => {
        console.error('Failed to load sessions', err)
        if (!cancelled) setIsLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const createNewSession = useCallback(async () => {
    const session = await createSession()
    setSessions((prev) => [session, ...prev])
    setCurrentSessionId(session.id)
    return session
  }, [])

  const selectSession = useCallback((id: string | null) => {
    setCurrentSessionId(id)
  }, [])

  const removeSession = useCallback(async (id: string) => {
    await deleteSession(id)
    setSessions((prev) => prev.filter((s) => s.id !== id))
    setCurrentSessionId((prev) => (prev === id ? null : prev))
  }, [])

  const updateSessionTitle = useCallback((id: string, title: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title } : s))
    )
  }, [])

  return {
    sessions,
    currentSessionId,
    isLoading,
    createNewSession,
    selectSession,
    removeSession,
    updateSessionTitle,
  }
}
