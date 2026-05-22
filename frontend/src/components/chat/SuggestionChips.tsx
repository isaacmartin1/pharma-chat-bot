'use client'

interface Props {
  onSelect: (text: string) => void
}

const SUGGESTIONS = [
  'Adjust the tone to be more urgent',
  'Add a dosing and administration section',
  'Add safety highlights and contraindications',
  'Change the headline to emphasize efficacy',
  'Make it shorter and punchier',
  'Add a patient support program section',
]

export function SuggestionChips({ onSelect }: Props) {
  return (
    <div className="px-4 pb-3 pt-1">
      <p className="text-xs text-gray-400 mb-2 font-medium">Suggested refinements</p>
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onSelect(s)}
            className="text-xs px-3 py-1.5 rounded-full border border-brand-purple/30 text-brand-purple hover:bg-brand-purple hover:text-white transition-colors bg-white shadow-sm"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
