'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Session, User, ComplianceResult } from '@/lib/types'
import { getMe, getSession } from '@/lib/api'
import { useSession } from '@/hooks/useSession'
import { AppShell } from '@/components/layout/AppShell'

export default function ChatPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const contentType = searchParams.get('type') ?? undefined
  const [user, setUser] = useState<User | null>(null)
  const [assetHtml, setAssetHtml] = useState<string | null>(null)
  const [assetId, setAssetId] = useState<string | null>(null)
  const [complianceResult, setComplianceResult] = useState<ComplianceResult | null>(null)
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false)

  const {
    sessions,
    currentSessionId,
    createNewSession,
    selectSession,
    removeSession,
    updateSessionTitle,
  } = useSession()

  const currentSession = sessions.find((s) => s.id === currentSessionId) ?? null

  useEffect(() => {
    const token = localStorage.getItem('pharma_token')
    if (!token) {
      router.replace('/login')
      return
    }
    getMe()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('pharma_token')
        router.replace('/login')
      })
  }, [router])

  const handleNewChat = useCallback(() => {
    // Reset to no-session state: onboarding modal will show,
    // and the session is created when the user submits the onboarding form
    selectSession(null)
    setAssetHtml(null)
    setAssetId(null)
    setComplianceResult(null)
  }, [selectSession])

  const handleSelectSession = useCallback(
    async (id: string) => {
      selectSession(id)
      setAssetHtml(null)
      setAssetId(null)
      setComplianceResult(null)
      try {
        const detail = await getSession(id)
        if (detail.latest_asset?.html_content) {
          setAssetHtml(detail.latest_asset.html_content)
          setAssetId(detail.latest_asset.id)
        }
      } catch (err) {
        console.error('Failed to load session detail', err)
      }
    },
    [selectSession]
  )

  const handleDeleteSession = useCallback(
    async (id: string) => {
      try {
        await removeSession(id)
        if (id === currentSessionId) {
          setAssetHtml(null)
          setAssetId(null)
          setComplianceResult(null)
        }
      } catch (err) {
        console.error('Failed to delete session', err)
      }
    },
    [removeSession, currentSessionId]
  )

  const currentSessionIdRef = useRef<string | null>(currentSessionId)
  useEffect(() => {
    currentSessionIdRef.current = currentSessionId
  }, [currentSessionId])

  const handleGetOrCreateSession = useCallback(async (): Promise<string> => {
    const existing = currentSessionIdRef.current
    if (existing) return existing
    const session = await createNewSession()
    setAssetHtml(null)
    setAssetId(null)
    setComplianceResult(null)
    return session.id
  }, [createNewSession])

  const handleLogout = useCallback(() => {
    localStorage.removeItem('pharma_token')
    router.replace('/login')
  }, [router])

  const handleAssetCreated = useCallback((html: string, id: string) => {
    setAssetHtml(html)
    setAssetId(id)
  }, [])

  const handleAssetChange = useCallback((html: string) => {
    setAssetHtml(html)
  }, [])

  const handleComplianceResult = useCallback((result: ComplianceResult) => {
    setComplianceResult(result)
  }, [])

  return (
    <AppShell
      sessions={sessions}
      currentSessionId={currentSessionId}
      currentSession={currentSession}
      user={user}
      assetHtml={assetHtml}
      assetId={assetId}
      complianceResult={complianceResult}
      onNewChat={handleNewChat}
      onSelectSession={handleSelectSession}
      onDeleteSession={handleDeleteSession}
      onLogout={handleLogout}
      onAssetCreated={handleAssetCreated}
      onAssetChange={handleAssetChange}
      onComplianceResult={handleComplianceResult}
      onGetOrCreateSession={handleGetOrCreateSession}
      onSessionTitleUpdated={updateSessionTitle}
      isAssetModalOpen={isAssetModalOpen}
      onCloseAssetModal={() => setIsAssetModalOpen(false)}
      onOpenAssetModal={() => setIsAssetModalOpen(true)}
      contentType={contentType}
      defaultDrug={user?.drug_name ?? ''}
    />
  )
}
