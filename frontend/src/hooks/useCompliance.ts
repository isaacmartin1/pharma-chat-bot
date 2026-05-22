'use client'

import { useState, useCallback } from 'react'
import type { ComplianceCheck } from '@/lib/types'
import { checkCompliance } from '@/lib/api'

export function useCompliance(assetId: string | null) {
  const [checks, setChecks] = useState<ComplianceCheck[]>([])
  const [overall, setOverall] = useState<string>('')
  const [isChecking, setIsChecking] = useState(false)
  const [customCheckNames, setCustomCheckNames] = useState<string[]>([])

  const addCustomCheck = useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setCustomCheckNames(prev => prev.includes(trimmed) ? prev : [...prev, trimmed])
  }, [])

  const removeCustomCheck = useCallback((name: string) => {
    setCustomCheckNames(prev => prev.filter(n => n !== name))
  }, [])

  const runChecks = useCallback(async () => {
    if (!assetId) return
    setIsChecking(true)
    try {
      const result = await checkCompliance(assetId, customCheckNames)
      setChecks(result.checks)
      setOverall(result.overall)
    } catch (err) {
      console.error('Compliance check failed', err)
    } finally {
      setIsChecking(false)
    }
  }, [assetId, customCheckNames])

  const setComplianceResult = useCallback(
    (result: { overall: string; checks: ComplianceCheck[] }) => {
      setChecks(result.checks)
      setOverall(result.overall)
    },
    []
  )

  return { checks, overall, runChecks, isChecking, setComplianceResult, customCheckNames, addCustomCheck, removeCustomCheck }
}
