'use client'

import type { Message } from '@/lib/types'
import ReactMarkdown from 'react-markdown'
import { StreamingCursor } from './StreamingCursor'
import { ClaimsApprovalCard } from './ClaimsApprovalCard'
import { QuickReplies } from './QuickReplies'

interface Props {
  message: Message
  isLastAssistant?: boolean
  isStreaming?: boolean
  onApprove?: (msg: string) => void
}

export function MessageBubble({ message, isLastAssistant, isStreaming, onApprove }: Props) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-[75%] bg-brand-purple text-white rounded-2xl px-4 py-2.5 text-sm">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    )
  }

  const hasClaimsSignal = message.content?.includes('CLAIMS_PROPOSED')
  const hasQuickReply = message.content?.includes('QUICK_REPLY[')

  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[80%] bg-white border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-800 shadow-sm">
        <div className="prose prose-sm max-w-none">
          {message.content ? (
            hasQuickReply && !isStreaming && isLastAssistant ? (
              <QuickReplies content={message.content} onSelect={onApprove ?? (() => {})} />
            ) : hasClaimsSignal && !isStreaming ? (
              <ClaimsApprovalCard
                content={message.content}
                onApprove={onApprove ?? (() => {})}
              />
            ) : (
              <>
                <ReactMarkdown>{message.content}</ReactMarkdown>
                {isLastAssistant && isStreaming && <StreamingCursor />}
              </>
            )
          ) : (
            <div className="flex items-center gap-2 py-0.5">
              <svg
                width="18"
                height="18"
                viewBox="0 0 20 20"
                style={{ animation: 'spin 2.2s linear infinite' }}
                fill="none"
              >
                {[...Array(8)].map((_, i) => (
                  <rect
                    key={i}
                    x="9" y="1.5" width="2" height="5.5"
                    rx="1"
                    fill="#8C4799"
                    opacity={0.15 + (i / 8) * 0.85}
                    transform={`rotate(${i * 45} 10 10)`}
                  />
                ))}
              </svg>
              <span className="thinking-shimmer text-sm font-medium">Thinking...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
