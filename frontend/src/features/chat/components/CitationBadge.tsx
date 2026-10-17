import { FileText } from 'lucide-react'
import { Citation } from '../types'

interface CitationBadgeProps {
  citation: Citation
  onClick: (citation: Citation) => void
}

export function CitationBadge({ citation, onClick }: CitationBadgeProps) {
  const pageLabel = citation.page_number !== null ? `p. ${citation.page_number}` : ''

  return (
    <button
      type="button"
      onClick={() => onClick(citation)}
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-gray-50 hover:bg-[#b6f526]/20 text-gray-800 hover:text-black border border-gray-200 hover:border-[#b6f526] transition-all cursor-pointer group shadow-sm active:scale-95"
      title={`View source passage: ${citation.filename} ${pageLabel}`}
    >
      <span className="font-extrabold text-[#3b6009] px-1 py-0.2 rounded bg-[#b6f526]/30">
        [{citation.citation_id}]
      </span>
      <FileText className="w-3.5 h-3.5 text-gray-500 group-hover:text-black" />
      <span className="truncate max-w-[130px] font-medium">{citation.filename}</span>
      {pageLabel && (
        <span className="text-[10px] text-gray-500 font-mono">
          {pageLabel}
        </span>
      )}
    </button>
  )
}
