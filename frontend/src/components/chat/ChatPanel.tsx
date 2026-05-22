'use client'

import type { ComplianceResult, Session } from '@/lib/types'
import { useChat } from '@/hooks/useChat'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { OnboardingModal } from './OnboardingModal'
import { useEffect, useCallback, useRef, useState } from 'react'
import { getSession } from '@/lib/api'

interface Props {
  sessionId: string | null
  session: Session | null
  onAssetCreated: (html: string, id: string) => void
  onComplianceResult: (result: ComplianceResult) => void
  onGetOrCreateSession: () => Promise<string>
  onSessionTitleUpdated?: (id: string, title: string) => void
  contentType?: string
  defaultDrug?: string
}

export function ChatPanel({
  sessionId,
  session,
  onAssetCreated,
  onComplianceResult,
  onGetOrCreateSession,
  onSessionTitleUpdated,
  contentType,
  defaultDrug,
}: Props) {
  const { messages, isStreaming, sendMessage, loadMessages, lastAssetEvent } = useChat(
    sessionId,
    onAssetCreated,
    onComplianceResult,
    onSessionTitleUpdated
  )

  const [showOnboarding, setShowOnboarding] = useState(false)

  // Track whether we're actively sending so the session-load effect
  // doesn't overwrite optimistic messages mid-stream.
  const isSendingRef = useRef(false)

  // Keep a ref to sessionId so handleSend always reads the current value even
  // if the closure was captured before a state update propagated (React async batching
  // can leave handleSend holding sessionId=null after a session was just created).
  const sessionIdRef = useRef<string | null>(sessionId)
  useEffect(() => {
    sessionIdRef.current = sessionId
  }, [sessionId])

  const handleSend = useCallback(async (content: string, uploadIds: string[]) => {
    isSendingRef.current = true
    try {
      const sid = sessionIdRef.current ?? await onGetOrCreateSession()
      await sendMessage(content, uploadIds, sid)
    } finally {
      isSendingRef.current = false
    }
  }, [sendMessage, onGetOrCreateSession])

  // Show onboarding only when there is no session selected (null = new chat state)
  useEffect(() => {
    if (sessionId === null) {
      setShowOnboarding(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  // Only reload messages when the selected session changes, not when
  // isStreaming toggles (that would wipe optimistic messages).
  useEffect(() => {
    if (!sessionId) {
      loadMessages([])
      return
    }
    if (isSendingRef.current) return
    let cancelled = false
    getSession(sessionId)
      .then((detail) => {
        if (!cancelled && !isSendingRef.current) loadMessages(detail.messages)
      })
      .catch((err) => console.error('Failed to load session', err))
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, loadMessages])

  const handleOnboardingSubmit = useCallback(
    async (params: { contentType: string; audience: string; goal: string; tone: string; drug: string }) => {
      setShowOnboarding(false)
      const CONTENT_TYPE_LABELS: Record<string, string> = {
        hcp_outreach: 'HCP outreach email',
        product_launch: 'product launch email',
        congress_followup: 'congress follow-up email',
        patient_support: 'patient support email',
      }
      const label = CONTENT_TYPE_LABELS[params.contentType] ?? params.contentType
      const firstMessage = `Generate a ${label} about ${params.drug} for ${params.audience} with campaign goal: ${params.goal}, tone: ${params.tone}. All details confirmed — skip straight to proposing claims.`
      await handleSend(firstMessage, [])
    },
    [handleSend]
  )

  const handleApprove = useCallback(
    async (approvalMsg: string) => {
      await handleSend(approvalMsg, [])
    },
    [handleSend]
  )

  return (
    <>
      <OnboardingModal
        isOpen={showOnboarding}
        contentType={contentType}
        defaultDrug={defaultDrug}
        onSubmit={handleOnboardingSubmit}
        onClose={() => setShowOnboarding(false)}
      />
      <div className="flex flex-col h-full bg-gray-50 border-x border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
          <h2 className="text-sm font-semibold text-brand-navy truncate">
            {session?.title || (sessionId ? 'Loading...' : 'No session selected')}
          </h2>
        </div>
        <MessageList
          messages={messages}
          isStreaming={isStreaming}
          onApprove={handleApprove}
          lastAssetEvent={lastAssetEvent}
          onSuggest={(text) => handleSend(text, [])}
        />
        <ChatInput
          sessionId={sessionId}
          isStreaming={isStreaming}
          onSend={handleSend}
        />
      </div>
    </>
  )
}
