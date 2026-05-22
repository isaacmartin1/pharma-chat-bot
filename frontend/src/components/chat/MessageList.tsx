'use client'

import { useEffect, useRef } from 'react'
import type { Message } from '@/lib/types'
import { MessageBubble } from './MessageBubble'
import { SuggestionChips } from './SuggestionChips'

interface Props {
  messages: Message[]
  isStreaming: boolean
  onApprove?: (msg: string) => void
  lastAssetEvent?: 'asset_created' | 'asset_updated' | null
  onSuggest?: (text: string) => void
}

export function MessageList({ messages, isStreaming, onApprove, lastAssetEvent, onSuggest }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: isStreaming ? 'instant' : 'smooth' })
  }, [messages.length, isStreaming])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Start a conversation to create a marketing asset
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
      {messages.map((msg, idx) => {
        const isLastAssistant =
          msg.role === 'assistant' && idx === messages.length - 1
        return (
          <MessageBubble
            key={msg.id}
            message={msg}
            isLastAssistant={isLastAssistant}
            isStreaming={isStreaming}
            onApprove={onApprove}
          />
        )
      })}
      {lastAssetEvent && !isStreaming && onSuggest && (
        <SuggestionChips onSelect={onSuggest} />
      )}
      <div ref={bottomRef} />
    </div>
  )
}
