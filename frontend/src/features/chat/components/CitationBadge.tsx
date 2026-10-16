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
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-surface-200/90 hover:bg-brand-500/20 text-slate-300 hover:text-brand-300 border border-surface-300 hover:border-brand-500/40 transition-all cursor-pointer group shadow-sm"
      title={`View source passage: ${citation.filename} ${pageLabel}`}
    >
      <span className="font-bold text-brand-400 group-hover:text-brand-300">
        [{citation.citation_id}]
      </span>
      <FileText className="w-3 h-3 text-slate-400 group-hover:text-brand-400" />
      <span className="truncate max-w-[120px]">{citation.filename}</span>
      {pageLabel && (
        <span className="text-[10px] text-slate-400 group-hover:text-slate-300">
          {pageLabel}
        </span>
      )}
    </button>
  )
}
