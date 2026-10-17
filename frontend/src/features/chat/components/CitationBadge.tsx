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
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-[#22242c] hover:bg-[#b6f526]/15 text-gray-200 hover:text-white border border-[#2f323e] hover:border-[#b6f526]/50 transition-all cursor-pointer group shadow-sm active:scale-95"
      title={`View source passage: ${citation.filename} ${pageLabel}`}
    >
      <span className="font-extrabold text-[#b6f526] px-1.5 py-0.5 rounded bg-[#b6f526]/15">
        [{citation.citation_id}]
      </span>
      <FileText className="w-3.5 h-3.5 text-gray-400 group-hover:text-white" />
      <span className="truncate max-w-[140px] font-medium text-gray-200 group-hover:text-white">{citation.filename}</span>
      {pageLabel && (
        <span className="text-[10px] text-gray-400 font-mono">
          {pageLabel}
        </span>
      )}
    </button>
  )
}
