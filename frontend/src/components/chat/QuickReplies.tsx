'use client'

interface Props {
  content: string
  onSelect: (answer: string) => void
}

function parseQuickReply(content: string): { question: string; options: string[] } | null {
  const match = /QUICK_REPLY\[([^\]]+)\]:\s*(.+)/.exec(content)
  if (!match) return null
  const question = match[1].trim()
  const options = match[2].split('|').map((o) => o.trim()).filter(Boolean)
  return { question, options }
}

export function QuickReplies({ content, onSelect }: Props) {
  const parsed = parseQuickReply(content)
  if (!parsed) return null

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-gray-700">{parsed.question}</p>
      <div className="flex flex-wrap gap-2">
        {parsed.options.map((opt) => (
          <button
            key={opt}
            onClick={() => onSelect(opt)}
            className="px-4 py-2 rounded-full border border-purple-300 text-sm font-medium text-purple-700 bg-white hover:bg-purple-50 hover:border-purple-500 transition-colors"
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}
