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
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <div className="w-3.5 h-3.5 border-2 border-[#b6f526] border-t-transparent rounded-full animate-spin" />
        <span>Loading library documents...</span>
      </div>
    )
  }

  if (readyDocs.length === 0) {
    return (
      <div className="text-xs text-amber-700 flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
        <span>No processed documents available. Upload documents in library to query them.</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
      <span className="text-xs font-bold text-gray-500 whitespace-nowrap flex items-center gap-1 uppercase tracking-wider">
        Scope:
      </span>

      {/* All Documents Pill */}
      <button
        type="button"
        onClick={() => onSelectDocId(null)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
          selectedDocId === null
            ? 'bg-[#b6f526] text-black shadow-sm'
            : 'bg-white text-gray-600 hover:text-black hover:bg-gray-100 border border-gray-200'
        }`}
      >
        <Layers className="w-3.5 h-3.5" />
        <span>All Documents ({readyDocs.length})</span>
        {selectedDocId === null && <Check className="w-3 h-3 text-black stroke-[3]" />}
      </button>

      {/* Specific Document Pills */}
      {readyDocs.map((doc) => {
        const isSelected = selectedDocId === doc.id
        return (
          <button
            key={doc.id}
            type="button"
            onClick={() => onSelectDocId(isSelected ? null : doc.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold max-w-[200px] truncate transition-all active:scale-95 ${
              isSelected
                ? 'bg-[#b6f526] text-black shadow-sm'
                : 'bg-white text-gray-600 hover:text-black hover:bg-gray-100 border border-gray-200'
            }`}
            title={doc.original_filename}
          >
            <FileText className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{doc.original_filename}</span>
            {isSelected && <Check className="w-3 h-3 text-black flex-shrink-0 stroke-[3]" />}
          </button>
        )
      })}
    </div>
  )
}
