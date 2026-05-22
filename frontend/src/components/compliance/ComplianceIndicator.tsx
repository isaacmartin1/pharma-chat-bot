'use client'

import type { ComplianceCheck } from '@/lib/types'

interface Props {
  check: ComplianceCheck
}

const CheckIcon = () => (
  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="2.5 8.5 6 12 13.5 4" />
  </svg>
)

const WarningIcon = () => (
  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2.5L14 13.5H2L8 2.5z" />
    <line x1="8" y1="6.5" x2="8" y2="9.5" />
    <circle cx="8" cy="11.5" r="0.6" fill="currentColor" stroke="none" />
  </svg>
)

const XIcon = () => (
  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <line x1="4" y1="4" x2="12" y2="12" />
    <line x1="12" y1="4" x2="4" y2="12" />
  </svg>
)

const statusConfig = {
  green: {
    classes: 'bg-green-50 text-green-800 border border-green-200',
    Icon: CheckIcon,
  },
  yellow: {
    classes: 'bg-yellow-50 text-yellow-800 border border-yellow-200',
    Icon: WarningIcon,
  },
  red: {
    classes: 'bg-red-50 text-red-800 border border-red-200',
    Icon: XIcon,
  },
}

export function ComplianceIndicator({ check }: Props) {
  const config = statusConfig[check.status]
  const { Icon } = config

  return (
    <div className={`rounded-lg px-3 py-2 text-xs ${config.classes}`}>
      <div className="flex items-center gap-1.5 font-medium mb-0.5">
        <Icon />
        <span>{check.name}</span>
      </div>
      <p className="opacity-75 leading-snug">{check.message}</p>
    </div>
  )
}
