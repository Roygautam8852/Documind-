import { FileText, Layers, Check } from 'lucide-react'
import { useDocuments } from '@/features/documents/api'

interface DocumentSelectorProps {
  selectedDocId: string | null
  onSelectDocId: (docId: string | null) => void
}

export function DocumentSelector({ selectedDocId, onSelectDocId }: DocumentSelectorProps) {
  const { data, isLoading } = useDocuments(1, 100)

  const readyDocs = (data?.items || []).filter((d) => d.status === 'ready')

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <div className="w-3.5 h-3.5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <span>Loading library documents...</span>
      </div>
    )
  }

  if (readyDocs.length === 0) {
    return (
      <div className="text-xs text-amber-400/90 flex items-center gap-1.5 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
        <span>No processed documents available. Upload documents in the library to query them.</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
      <span className="text-xs font-medium text-slate-400 whitespace-nowrap flex items-center gap-1">
        Scope:
      </span>

      {/* All Documents Pill */}
      <button
        type="button"
        onClick={() => onSelectDocId(null)}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
          selectedDocId === null
            ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40 shadow-sm'
            : 'bg-surface-200 text-slate-400 hover:text-slate-200 hover:bg-surface-300 border border-surface-300'
        }`}
      >
        <Layers className="w-3 h-3" />
        <span>All Documents ({readyDocs.length})</span>
        {selectedDocId === null && <Check className="w-3 h-3 text-brand-400" />}
      </button>

      {/* Specific Document Pills */}
      {readyDocs.map((doc) => {
        const isSelected = selectedDocId === doc.id
        return (
          <button
            key={doc.id}
            type="button"
            onClick={() => onSelectDocId(isSelected ? null : doc.id)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium max-w-[200px] truncate transition-all ${
              isSelected
                ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40 shadow-sm'
                : 'bg-surface-200 text-slate-400 hover:text-slate-200 hover:bg-surface-300 border border-surface-300'
            }`}
            title={doc.original_filename}
          >
            <FileText className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{doc.original_filename}</span>
            {isSelected && <Check className="w-3 h-3 text-brand-400 flex-shrink-0" />}
          </button>
        )
      })}
    </div>
  )
}
