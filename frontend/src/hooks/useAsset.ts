'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { updateAsset, undoAsset } from '@/lib/api'
import type { Asset } from '@/lib/types'

export function useAsset(assetId: string | null) {
  const [isSaving, setIsSaving] = useState(false)
  const [isUndoing, setIsUndoing] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const saveAsset = useCallback(
    (html: string) => {
      if (!assetId) return
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      timerRef.current = setTimeout(async () => {
        setIsSaving(true)
        try {
          await updateAsset(assetId, html)
        } catch (err) {
          console.error('Failed to save asset', err)
        } finally {
          setIsSaving(false)
        }
      }, 500)
    },
    [assetId]
  )

  const undoEdit = useCallback(async (): Promise<Asset | null> => {
    if (!assetId) return null
    setIsUndoing(true)
    try {
      return await undoAsset(assetId)
    } catch (err) {
      console.error('Failed to undo asset', err)
      return null
    } finally {
      setIsUndoing(false)
    }
  }, [assetId])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return { saveAsset, isSaving, undoEdit, isUndoing }
}
