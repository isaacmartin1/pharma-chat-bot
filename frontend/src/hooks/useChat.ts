'use client'

import { useState, useCallback, useRef } from 'react'
import type { Message, ComplianceResult } from '@/lib/types'
import { sendMessageStream } from '@/lib/api'

let messageIdCounter = 0
function generateId(): string {
  return `local-${Date.now()}-${++messageIdCounter}`
}

export function useChat(
  sessionId: string | null,
  onAssetCreated: (html: string, id: string) => void,
  onComplianceResult: (result: ComplianceResult) => void,
  onSessionTitleUpdated?: (id: string, title: string) => void
) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [lastAssetEvent, setLastAssetEvent] = useState<'asset_created' | 'asset_updated' | null>(null)
  const assistantIdRef = useRef<string | null>(null)

  const loadMessages = useCallback((msgs: Message[]) => {
    setMessages(msgs)
  }, [])

  const sendMessage = useCallback(
    async (content: string, uploadIds: string[], overrideSessionId?: string) => {
      const sid = overrideSessionId ?? sessionId
      if (!sid || isStreaming) return

      setLastAssetEvent(null)

      const userMessage: Message = {
        id: generateId(),
        session_id: sid,
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMessage])
      setIsStreaming(true)

      const assistantId = generateId()
      assistantIdRef.current = assistantId
      const assistantMessage: Message = {
        id: assistantId,
        session_id: sid,
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, assistantMessage])

      async function fetchWithRetry(sessionId: string, content: string, uploadIds: string[], maxRetries = 3): Promise<Response> {
        let lastErr: Error | null = null
        for (let i = 0; i < maxRetries; i++) {
          try {
            const res = await sendMessageStream(sessionId, content, uploadIds)
            if (res.ok) return res
            if (res.status >= 400 && res.status < 500) throw new Error(`HTTP ${res.status}`)
            // 5xx: retry
          } catch (e) {
            lastErr = e as Error
          }
          await new Promise(r => setTimeout(r, Math.min(1000 * 2 ** i, 5000)))
        }
        throw lastErr ?? new Error('Stream failed after retries')
      }

      try {
        const response = await fetchWithRetry(sid, content, uploadIds)

        if (!response.body) {
          throw new Error('No response body')
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const parts = buffer.split('\n\n')
          buffer = parts.pop() ?? ''

          for (const part of parts) {
            const line = part.trim()
            if (!line.startsWith('data:')) continue
            const jsonStr = line.slice(5).trim()
            if (!jsonStr || jsonStr === '[DONE]') continue

            try {
              const event = JSON.parse(jsonStr)
              handleEvent(event)
            } catch (e) {
              console.error('Failed to parse SSE event', e, jsonStr)
            }
          }
        }

        // Process any remaining buffer
        if (buffer.trim()) {
          const line = buffer.trim()
          if (line.startsWith('data:')) {
            const jsonStr = line.slice(5).trim()
            if (jsonStr && jsonStr !== '[DONE]') {
              try {
                const event = JSON.parse(jsonStr)
                handleEvent(event)
              } catch (e) {
                console.error('Failed to parse SSE event', e)
              }
            }
          }
        }
      } catch (err) {
        console.error('Stream error', err)
      } finally {
        setIsStreaming(false)
      }

      function handleEvent(event: { type: string; [key: string]: unknown }) {
        switch (event.type) {
          case 'text_delta': {
            const delta = (event.delta as string) ?? ''
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + delta } : m
              )
            )
            break
          }
          case 'asset_html_delta': {
            // HTML chunks arrive progressively during streaming generation.
            // The full HTML is delivered in the subsequent asset_created event,
            // so we don't need to do anything here — the case just prevents
            // the event from falling through to an unhandled path.
            break
          }
          case 'asset_created': {
            const html = (event.html as string) ?? ''
            const id = (event.asset_id as string) ?? ''
            onAssetCreated(html, id)
            setLastAssetEvent('asset_created')
            break
          }
          case 'asset_updated': {
            const html = (event.html as string) ?? ''
            const id = (event.asset_id as string) ?? ''
            onAssetCreated(html, id)
            setLastAssetEvent('asset_updated')
            break
          }
          case 'compliance_result': {
            const result: ComplianceResult = {
              checks: (event.checks as ComplianceResult['checks']) ?? [],
              overall: (event.overall as ComplianceResult['overall']) ?? 'pass',
            }
            onComplianceResult(result)
            break
          }
          case 'compliance_fixing': {
            const attempt = (event.attempt as number) ?? 1
            const failures = (event.failures as number) ?? 0
            const fixingNote = `\n\n_Fixing compliance issue (attempt ${attempt}, ${failures} failure${failures !== 1 ? 's' : ''})..._`
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + fixingNote } : m
              )
            )
            break
          }
          case 'done': {
            const title = event.session_title as string | undefined
            if (title && onSessionTitleUpdated && sid) {
              onSessionTitleUpdated(sid, title)
            }
            setIsStreaming(false)
            break
          }
          case 'asset_error': {
            // Asset generation failed — show warning in chat but don't crash
            const errText = (event.content as string) ?? 'Asset generation failed.'
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + (m.content ? '\n\n' : '') + `⚠️ ${errText}` }
                  : m
              )
            )
            break
          }
          case 'error': {
            const errText = (event.content as string) ?? 'An error occurred.'
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content || `⚠️ ${errText}` }
                  : m
              )
            )
            setIsStreaming(false)
            break
          }
        }
      }
    },
    [sessionId, isStreaming, onAssetCreated, onComplianceResult, onSessionTitleUpdated]
  )

  return { messages, isStreaming, sendMessage, loadMessages, lastAssetEvent }
}
