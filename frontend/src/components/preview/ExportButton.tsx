'use client'

import { useState } from 'react'
import { exportAsset } from '@/lib/api'

interface Props {
  assetId: string | null
  complianceOverall?: string
}

export function ExportButton({ assetId, complianceOverall }: Props) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const isBlocked = complianceOverall === 'fail'

  const handleExport = async () => {
    if (!assetId || isBlocked) return
    setIsExporting(true)
    setExportError(null)
    try {
      const blob = await exportAsset(assetId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `asset-${assetId}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed', err)
      setExportError('Export failed — please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {isBlocked && (
        <p className="text-xs text-red-600 text-center">
          Resolve compliance failures before exporting
        </p>
      )}
      {exportError && (
        <p className="text-xs text-red-600 text-center">{exportError}</p>
      )}
      <button
        onClick={handleExport}
        disabled={!assetId || isExporting || isBlocked}
        title={isBlocked ? 'Fix red compliance failures to enable export' : undefined}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-brand-navy text-white text-sm font-medium rounded-lg hover:bg-brand-navy/90 transition-colors disabled:opacity-40"
      >
      {isExporting ? (
        <>
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Exporting...
        </>
      ) : (
        <>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export Asset
        </>
      )}
      </button>
    </div>
  )
}
