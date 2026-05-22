'use client'

import { useState, useEffect } from 'react'
import type { ComplianceCheck, ComplianceResult } from '@/lib/types'
import { AssetIframe } from './AssetIframe'
import { InlineEditOverlay } from './InlineEditOverlay'
import { EditModeToggle } from './EditModeToggle'
import { ExportButton } from './ExportButton'
import { CompliancePanel } from '../compliance/CompliancePanel'
import { useAsset } from '@/hooks/useAsset'
import { useCompliance } from '@/hooks/useCompliance'

interface Props {
  assetHtml: string | null
  assetId: string | null
  onAssetChange: (html: string) => void
  complianceResult: ComplianceResult | null
  onExpand?: () => void
}

export function PreviewPanel({ assetHtml, assetId, onAssetChange, complianceResult, onExpand }: Props) {
  const [editMode, setEditMode] = useState<'preview' | 'edit'>('preview')
  const { saveAsset, isSaving, undoEdit, isUndoing } = useAsset(assetId)
  const {
    checks,
    overall,
    runChecks,
    isChecking,
    setComplianceResult,
    customCheckNames,
    addCustomCheck,
    removeCustomCheck,
  } = useCompliance(assetId)

  // Sync external compliance results
  useEffect(() => {
    if (complianceResult) {
      setComplianceResult(complianceResult)
    }
  }, [complianceResult, setComplianceResult])

  const handleSave = (html: string) => {
    onAssetChange(html)
    saveAsset(html)
  }

  const handleUndo = async () => {
    const restored = await undoEdit()
    if (restored?.html_content) {
      onAssetChange(restored.html_content)
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-brand-navy">Preview</h2>
          {isSaving && (
            <span className="text-xs text-gray-400">Saving...</span>
          )}
        </div>
        {assetHtml && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleUndo}
              disabled={isUndoing}
              title="Undo last change"
              className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7v6h6" />
                <path d="M3 13C5 8 9 5 14 5a9 9 0 0 1 9 9" />
              </svg>
            </button>
            {onExpand && (
              <button
                onClick={onExpand}
                title="Expand preview"
                className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
              </button>
            )}
            <EditModeToggle mode={editMode} onChange={setEditMode} />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden relative">
        {!assetHtml ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
              <p className="text-sm">No asset generated yet</p>
              <p className="text-xs mt-1 opacity-60">Start chatting to create a marketing asset</p>
            </div>
          </div>
        ) : editMode === 'preview' ? (
          <div className="relative h-full group cursor-pointer" onClick={onExpand}>
            <AssetIframe html={assetHtml} />
            {onExpand && (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow text-xs font-medium text-gray-700 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                  </svg>
                  Click to expand
                </div>
              </div>
            )}
          </div>
        ) : (
          <InlineEditOverlay html={assetHtml} onSave={handleSave} />
        )}
      </div>

      <CompliancePanel
        checks={checks}
        overall={overall}
        isChecking={isChecking}
        onRunChecks={runChecks}
        assetId={assetId}
        customCheckNames={customCheckNames}
        onAddCustomCheck={addCustomCheck}
        onRemoveCustomCheck={removeCustomCheck}
      />

      <div className="px-4 py-3 border-t border-gray-200 bg-white flex-shrink-0">
        <ExportButton assetId={assetId} complianceOverall={overall} />
      </div>
    </div>
  )
}
