'use client'

import { useRef, useState, KeyboardEvent, useCallback, useEffect } from 'react'
import { FileAttachment } from './FileAttachment'

interface Props {
  sessionId: string | null
  isStreaming: boolean
  onSend: (content: string, uploadIds: string[]) => void
}

export function ChatInput({ sessionId, isStreaming, onSend }: Props) {
  const [value, setValue] = useState('')
  const [pendingUploads, setPendingUploads] = useState<{ id: string; name: string }[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const resize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const lineHeight = 24
    const maxHeight = lineHeight * 5
    el.style.height = Math.min(el.scrollHeight, maxHeight) + 'px'
  }, [])

  const handleSubmit = useCallback(() => {
    const content = value.trim()
    if (!content || isStreaming) return
    onSend(content, pendingUploads.map((u) => u.id))
    setValue('')
    setPendingUploads([])
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, isStreaming, onSend, pendingUploads])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  const handleUploaded = useCallback((id: string, name: string) => {
    setPendingUploads((prev) => [...prev, { id, name }])
  }, [])

  const removeUpload = useCallback((id: string) => {
    setPendingUploads((prev) => prev.filter((u) => u.id !== id))
  }, [])

  useEffect(() => {
    const handler = () => textareaRef.current?.focus()
    window.addEventListener('focus-chat-input', handler)
    return () => window.removeEventListener('focus-chat-input', handler)
  }, [])

  return (
    <div className="border-t border-gray-200 p-3 bg-white">
      {pendingUploads.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {pendingUploads.map((u) => (
            <span
              key={u.id}
              className="inline-flex items-center gap-1 bg-brand-purple/10 text-brand-purple text-xs px-2 py-1 rounded-full"
            >
              <span className="max-w-[120px] truncate">{u.name}</span>
              <button
                onClick={() => removeUpload(u.id)}
                className="hover:text-red-500 leading-none"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2 bg-gray-50 rounded-xl border border-gray-200 px-3 py-2 focus-within:border-brand-purple focus-within:ring-1 focus-within:ring-brand-purple transition-colors">
        <FileAttachment
          sessionId={sessionId}
          onUploaded={handleUploaded}
          disabled={isStreaming}
        />
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            resize()
          }}
          onKeyDown={handleKeyDown}
          disabled={isStreaming}
          placeholder="Message... (Enter to send, Shift+Enter for newline)"
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none leading-6 py-0.5"
        />
        <button
          onClick={handleSubmit}
          disabled={!value.trim() || isStreaming}
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-purple text-white disabled:opacity-40 hover:bg-brand-purple/90 transition-colors flex-shrink-0"
        >
          {isStreaming ? (
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22 11 13 2 9l20-7z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
