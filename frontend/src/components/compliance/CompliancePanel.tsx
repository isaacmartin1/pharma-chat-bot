'use client'

import { useState, useRef, useCallback } from 'react'
import type { ComplianceCheck } from '@/lib/types'
import { ComplianceIndicator } from './ComplianceIndicator'

interface Props {
  checks: ComplianceCheck[]
  overall: string
  isChecking: boolean
  onRunChecks: () => void
  assetId: string | null
  customCheckNames: string[]
  onAddCustomCheck: (name: string) => void
  onRemoveCustomCheck: (name: string) => void
}

const overallConfig: Record<string, { classes: string; label: string }> = {
  pass: { classes: 'bg-green-100 text-green-800', label: 'Pass' },
  warning: { classes: 'bg-yellow-100 text-yellow-800', label: 'Warning' },
  fail: { classes: 'bg-red-100 text-red-800', label: 'Fail' },
}

export function CompliancePanel({
  checks,
  overall,
  isChecking,
  onRunChecks,
  assetId,
  customCheckNames,
  onAddCustomCheck,
  onRemoveCustomCheck,
}: Props) {
  const [showInput, setShowInput] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const submittedRef = useRef(false)
  const config = overall ? overallConfig[overall] : null

  const openInput = () => {
    submittedRef.current = false
    setShowInput(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      submittedRef.current = true
      const trimmed = inputValue.trim()
      if (trimmed) onAddCustomCheck(trimmed)
      setInputValue('')
      setShowInput(false)
    } else if (e.key === 'Escape') {
      submittedRef.current = true
      setInputValue('')
      setShowInput(false)
    }
  }

  const handleBlur = useCallback(() => {
    if (submittedRef.current) {
      submittedRef.current = false
      return
    }
    const trimmed = inputValue.trim()
    if (trimmed) onAddCustomCheck(trimmed)
    setInputValue('')
    setShowInput(false)
  }, [inputValue, onAddCustomCheck])

  return (
    <div className="border-t border-gray-200 bg-white">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Compliance</h3>
          {config && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.classes}`}>
              {config.label}
            </span>
          )}
          <button
            onClick={openInput}
            title="Add custom regulation check"
            className="w-4 h-4 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg viewBox="0 0 10 10" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="5" y1="1" x2="5" y2="9" />
              <line x1="1" y1="5" x2="9" y2="5" />
            </svg>
          </button>
        </div>
        <button
          onClick={onRunChecks}
          disabled={!assetId || isChecking}
          className="text-xs px-3 py-1.5 bg-brand-purple text-white rounded-lg hover:bg-brand-purple/90 disabled:opacity-40 transition-colors"
        >
          {isChecking ? 'Checking...' : 'Run Checks'}
        </button>
      </div>

      {showInput && (
        <div className="px-4 pb-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder="e.g. Fair balance, Boxed warning..."
            className="w-full text-xs border border-brand-purple/40 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-purple/50 placeholder-gray-300"
          />
        </div>
      )}

      {customCheckNames.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1">
          {customCheckNames.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 rounded px-2 py-0.5"
            >
              {name}
              <button
                onClick={() => onRemoveCustomCheck(name)}
                className="text-gray-400 hover:text-gray-600 leading-none"
                aria-label={`Remove ${name}`}
              >
                <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="2" y1="2" x2="8" y2="8" />
                  <line x1="8" y1="2" x2="2" y2="8" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {checks.length > 0 && (
        <div className="px-4 pb-3 space-y-1.5 max-h-40 overflow-y-auto">
          {checks.map((check) => (
            <ComplianceIndicator key={check.id} check={check} />
          ))}
        </div>
      )}

      {checks.length === 0 && !isChecking && (
        <p className="px-4 pb-3 text-xs text-gray-400">
          No compliance checks run yet
        </p>
      )}
    </div>
  )
}
