'use client'

import { useRef, useState } from 'react'
import { uploadFile } from '@/lib/api'

interface Props {
  sessionId: string | null
  onUploaded: (uploadId: string, filename: string) => void
  disabled?: boolean
}

export function FileAttachment({ sessionId, onUploaded, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    const maxSize = 10 * 1024 * 1024 // 10 MB
    if (file.size > maxSize) {
      setUploadError('File must be under 10 MB')
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    setIsUploading(true)
    try {
      const upload = await uploadFile(file, sessionId ?? undefined)
      onUploaded(upload.id, file.name)
    } catch (err) {
      console.error('Upload failed', err)
      setUploadError('Upload failed — please try again')
    } finally {
      setIsUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="relative flex-shrink-0">
      {uploadError && (
        <span className="absolute bottom-full left-0 mb-1 text-xs text-red-600 bg-white border border-red-200 rounded px-2 py-0.5 whitespace-nowrap shadow-sm z-10">
          {uploadError}
        </span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.csv,.docx,.pptx"
        className="hidden"
        onChange={handleChange}
        disabled={disabled || isUploading}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || isUploading}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-brand-purple hover:bg-gray-100 transition-colors disabled:opacity-50"
        title="Attach file"
      >
        {isUploading ? (
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
          </svg>
        )}
      </button>
    </div>
  )
}
