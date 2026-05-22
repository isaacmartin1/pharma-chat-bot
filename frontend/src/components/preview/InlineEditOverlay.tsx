'use client'

import DOMPurify from 'dompurify'

interface Props {
  html: string
  onSave: (html: string) => void
}

export function InlineEditOverlay({ html, onSave }: Props) {
  const sanitized = typeof window !== 'undefined' ? DOMPurify.sanitize(html) : html

  return (
    <div
      contentEditable
      suppressContentEditableWarning
      dangerouslySetInnerHTML={{ __html: sanitized }}
      onBlur={(e) => {
        const raw = e.currentTarget.innerHTML
        const sanitized = typeof window !== 'undefined' ? DOMPurify.sanitize(raw) : raw
        onSave(sanitized)
      }}
      className="w-full h-full overflow-auto p-0 outline-none"
    />
  )
}
