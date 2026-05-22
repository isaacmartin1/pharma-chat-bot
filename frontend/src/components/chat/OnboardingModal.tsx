'use client'

import { useState, useEffect } from 'react'

interface OnboardingParams {
  contentType: string
  audience: string
  goal: string
  tone: string
  drug: string
}

interface Props {
  isOpen: boolean
  contentType?: string
  defaultDrug?: string
  onSubmit: (params: OnboardingParams) => void
  onClose: () => void
}

const CONTENT_TYPES = [
  { value: 'hcp_outreach', label: 'HCP Email' },
  { value: 'product_launch', label: 'Product Launch' },
  { value: 'congress_followup', label: 'Congress Follow-Up' },
  { value: 'patient_support', label: 'Patient Support' },
]

const AUDIENCES = ['Healthcare Providers (HCPs)', 'Patients', 'Caregivers', 'Mixed']
const GOALS = ['Awareness', 'Education', 'Call-to-Action', 'Safety Update']
const TONES = ['Clinical', 'Empathetic', 'Urgent', 'Informative']

export function OnboardingModal({ isOpen, contentType: initialContentType, defaultDrug, onSubmit, onClose }: Props) {
  const [contentType, setContentType] = useState(initialContentType ?? '')
  const [drug, setDrug] = useState(defaultDrug ?? '')
  const [audience, setAudience] = useState(AUDIENCES[0])
  const [goal, setGoal] = useState(GOALS[0])
  const [tone, setTone] = useState(TONES[0])

  // Sync drug field when defaultDrug loads asynchronously (getMe resolves after mount)
  useEffect(() => {
    if (defaultDrug && !drug) setDrug(defaultDrug)
  }, [defaultDrug])

  if (!isOpen) return null

  const handleSubmit = () => {
    if (!contentType || !drug.trim()) return
    onSubmit({ contentType, audience, goal, tone, drug })
  }

  const chipBase = 'px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all'
  const chipActive = 'text-white border-transparent'
  const chipInactive = 'bg-white text-gray-600 border-gray-300 hover:border-purple-400'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-7 z-10">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <h2 className="text-xl font-bold mb-1" style={{ color: '#1B2A4A' }}>
          Set Up Your Asset
        </h2>
        <p className="text-sm text-gray-500 mb-6">Pick your options and we'll generate instantly.</p>

        {/* Drug / Product */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Drug / Product
          </label>
          <input
            type="text"
            value={drug}
            onChange={(e) => setDrug(e.target.value)}
            placeholder="e.g. FRUZAQLA® (fruquintinib)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
          />
        </div>

        {/* Content type */}
        <fieldset className="mb-5">
          <legend className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Content Type
          </legend>
          <div className="flex gap-2 flex-wrap">
            {CONTENT_TYPES.map((ct) => (
              <button
                key={ct.value}
                type="button"
                onClick={() => setContentType(ct.value)}
                className={`${chipBase} ${contentType === ct.value ? chipActive : chipInactive}`}
                style={contentType === ct.value ? { backgroundColor: '#1B2A4A', borderColor: '#1B2A4A' } : {}}
              >
                {ct.label}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Target audience */}
        <fieldset className="mb-5">
          <legend className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Target Audience
          </legend>
          <div className="flex gap-2 flex-wrap">
            {AUDIENCES.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAudience(a)}
                className={`${chipBase} ${audience === a ? chipActive : chipInactive}`}
                style={audience === a ? { backgroundColor: '#8C4799', borderColor: '#8C4799' } : {}}
              >
                {a}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Campaign goal */}
        <fieldset className="mb-5">
          <legend className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Campaign Goal
          </legend>
          <div className="flex gap-2 flex-wrap">
            {GOALS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGoal(g)}
                className={`${chipBase} ${goal === g ? chipActive : chipInactive}`}
                style={goal === g ? { backgroundColor: '#8C4799', borderColor: '#8C4799' } : {}}
              >
                {g}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Tone */}
        <fieldset className="mb-7">
          <legend className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Tone
          </legend>
          <div className="flex gap-2 flex-wrap">
            {TONES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTone(t)}
                className={`${chipBase} ${tone === t ? chipActive : chipInactive}`}
                style={tone === t ? { backgroundColor: '#8C4799', borderColor: '#8C4799' } : {}}
              >
                {t}
              </button>
            ))}
          </div>
        </fieldset>

        <button
          onClick={handleSubmit}
          disabled={!contentType || !drug.trim()}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ backgroundColor: '#1B2A4A' }}
        >
          Start Creating
        </button>
      </div>
    </div>
  )
}
