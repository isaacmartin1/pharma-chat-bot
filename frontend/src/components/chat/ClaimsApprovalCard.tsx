'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'

interface Props {
  content: string
  onApprove: (approvedMessage: string) => void
}

interface Claim {
  text: string
  source: string
  checked: boolean
}

function parseClaims(content: string): { intro: string; claims: Claim[] } {
  // Match both CLAIMS_PROPOSED[category]: and CLAIMS_PROPOSED for X:
  const signalRegex = /CLAIMS_PROPOSED(?:\[[^\]]*\]|\s+for\s+[^:]+):/i
  const match = signalRegex.exec(content)

  if (!match) {
    return { intro: content, claims: [] }
  }

  const intro = content.slice(0, match.index).trim()
  const claimsRaw = content.slice(match.index + match[0].length).trim()

  const claims: Claim[] = []
  const lines = claimsRaw.split('\n').filter((l) => l.trim())

  for (const line of lines) {
    // Handle both "1. text" and "- text" or "• text" formats
    const numberedMatch = /^\d+\.\s+(.+)$/.exec(line.trim())
    const bulletMatch = /^[-•*]\s+(.+)$/.exec(line.trim())
    const matched = numberedMatch || bulletMatch
    if (!matched) continue

    const body = matched[1]

    let claimText = body
    let source = ''

    const sourceParenMatch = /\(Source:\s*([^)]+)\)/i.exec(body)
    if (sourceParenMatch) {
      source = sourceParenMatch[1].trim()
      claimText = body.replace(sourceParenMatch[0], '').trim()
    } else {
      const sourceDashMatch = /[—–-]\s*(?:sourced\s+from|source):\s*(.+)$/i.exec(body)
      if (sourceDashMatch) {
        source = sourceDashMatch[1].trim()
        claimText = body.slice(0, sourceDashMatch.index).trim()
      }
    }

    claimText = claimText.replace(/^[""]|[""]$/g, '').trim()
    claims.push({ text: claimText, source, checked: true })
  }

  return { intro, claims }
}

const CheckIcon = () => (
  <svg className="mt-0.5 w-4 h-4 flex-shrink-0 text-purple-500" viewBox="0 0 16 16" fill="currentColor">
    <path d="M13.485 1.929a1 1 0 0 1 0 1.414L6.414 10.414a1 1 0 0 1-1.414 0L1.515 6.929a1 1 0 0 1 1.414-1.414L5.707 8.293l6.364-6.364a1 1 0 0 1 1.414 0z" />
  </svg>
)

export function ClaimsApprovalCard({ content, onApprove }: Props) {
  const { intro, claims: initialClaims } = parseClaims(content)
  const [claims, setClaims] = useState<Claim[]>(initialClaims)
  const [approved, setApproved] = useState(false)

  const toggleClaim = (idx: number) => {
    if (approved) return
    setClaims((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, checked: !c.checked } : c))
    )
  }

  const handleApprove = () => {
    const selected = claims.filter((c) => c.checked)
    // If no claims were parsed (unexpected AI format), still proceed to generate
    if (selected.length === 0 && claims.length > 0) {
      onApprove('Please revise the claims and try again.')
      return
    }
    setApproved(true)
    onApprove('I approve the selected claims. Please generate the asset.')
  }

  const handleModify = () => {
    window.dispatchEvent(new CustomEvent('focus-chat-input'))
  }

  return (
    <div className="flex flex-col gap-3">
      {intro && (
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown>{intro}</ReactMarkdown>
        </div>
      )}

      {claims.length > 0 && (
        <div className="flex flex-col gap-2 mt-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Proposed Claims
          </p>
          {claims.map((claim, idx) => (
            <div
              key={idx}
              onClick={() => toggleClaim(idx)}
              className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                approved
                  ? 'border-purple-200 bg-purple-50 cursor-default'
                  : claim.checked
                    ? 'border-purple-300 bg-purple-50 cursor-pointer'
                    : 'border-gray-200 bg-gray-50 opacity-60 cursor-pointer'
              }`}
            >
              {approved ? (
                <CheckIcon />
              ) : (
                <input
                  type="checkbox"
                  checked={claim.checked}
                  onChange={() => toggleClaim(idx)}
                  className="mt-0.5 w-4 h-4 accent-purple-600 flex-shrink-0"
                />
              )}
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className={`text-sm leading-snug ${approved ? 'text-gray-500' : 'text-gray-800'}`}>
                  &ldquo;{claim.text}&rdquo;
                </span>
                {claim.source && (
                  <span className="text-xs text-gray-400">
                    Sourced from: {claim.source}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {approved ? (
        <div className="flex items-center gap-2 mt-1 text-sm text-purple-700 font-medium">
          <CheckIcon />
          Claims approved — generating asset…
        </div>
      ) : (
        <div className="flex items-center gap-3 mt-1">
          <button
            onClick={handleApprove}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#8C4799' }}
          >
            Approve Selected Claims &amp; Generate
          </button>
          <button
            onClick={handleModify}
            className="text-sm text-purple-600 hover:text-purple-800 font-medium underline underline-offset-2 whitespace-nowrap"
          >
            Modify Claims
          </button>
        </div>
      )}
    </div>
  )
}
