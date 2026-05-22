'use client'

interface Props {
  mode: 'preview' | 'edit'
  onChange: (mode: 'preview' | 'edit') => void
}

export function EditModeToggle({ mode, onChange }: Props) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs font-medium">
      <button
        onClick={() => onChange('preview')}
        className={`px-3 py-1.5 transition-colors ${
          mode === 'preview'
            ? 'bg-brand-purple text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        Preview
      </button>
      <button
        onClick={() => onChange('edit')}
        className={`px-3 py-1.5 transition-colors ${
          mode === 'edit'
            ? 'bg-brand-purple text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        Edit
      </button>
    </div>
  )
}
