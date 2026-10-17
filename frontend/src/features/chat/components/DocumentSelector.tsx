import { useState, useRef, useEffect } from 'react'
import { FileText, Layers, Check, ChevronDown } from 'lucide-react'
import { useDocuments } from '@/features/documents/api'

interface DocumentSelectorProps {
  selectedDocId: string | null
  onSelectDocId: (docId: string | null) => void
}

export function DocumentSelector({ selectedDocId, onSelectDocId }: DocumentSelectorProps) {
  const { data, isLoading } = useDocuments(1, 100)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const readyDocs = (data?.items || []).filter((d) => d.status === 'ready')
  const activeDoc = readyDocs.find((d) => d.id === selectedDocId)

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
        <span>No processed documents available.</span>
      </div>
    )
  }

  return (
    <div className="relative flex items-center gap-2" ref={dropdownRef}>
      <span className="text-xs font-bold text-gray-500 whitespace-nowrap uppercase tracking-wider">
        Scope:
      </span>

      {/* Dropdown Toggle Box */}
      <button
        type="button"
        id="scope-dropdown-toggle"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#b6f526] hover:bg-[#a5e61c] text-black shadow-sm transition-all active:scale-[0.98] border border-[#a2df1d]"
        title={selectedDocId ? activeDoc?.original_filename : 'Query across all uploaded documents'}
      >
        {selectedDocId && activeDoc ? (
          <>
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="max-w-[140px] sm:max-w-[180px] truncate">
              {activeDoc.original_filename}
            </span>
          </>
        ) : (
          <>
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span>All Documents ({readyDocs.length})</span>
          </>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 text-black/80 stroke-[2.5] transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div className="absolute top-full mt-2 left-0 sm:left-auto sm:right-0 z-50 min-w-[260px] max-w-[320px] bg-white rounded-2xl shadow-xl border border-gray-200/90 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Query Scope
          </div>

          {/* All Documents Option */}
          <button
            type="button"
            id="scope-option-all"
            onClick={() => {
              onSelectDocId(null)
              setIsOpen(false)
            }}
            className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              selectedDocId === null
                ? 'bg-[#b6f526]/25 text-gray-900 border border-[#b6f526]/60'
                : 'text-gray-700 hover:bg-gray-100 hover:text-black border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[#b6f526]/30 flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4 text-black" />
              </div>
              <div className="text-left">
                <div className="font-bold text-gray-900">All Documents</div>
                <div className="text-[10px] text-gray-500 font-normal">
                  Ask questions across all {readyDocs.length} files
                </div>
              </div>
            </div>
            {selectedDocId === null && (
              <Check className="w-4 h-4 text-[#3b6009] stroke-[3] shrink-0" />
            )}
          </button>

          <div className="border-t border-gray-100 my-1" />

          {/* Specific Document Options */}
          <div className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Specific File ({readyDocs.length})
          </div>

          <div className="max-h-56 overflow-y-auto space-y-0.5 pr-0.5">
            {readyDocs.map((doc) => {
              const isSelected = selectedDocId === doc.id
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => {
                    onSelectDocId(doc.id)
                    setIsOpen(false)
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs transition-all ${
                    isSelected
                      ? 'bg-[#b6f526]/25 text-gray-900 font-bold border border-[#b6f526]/60'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-black border border-transparent'
                  }`}
                  title={doc.original_filename}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <FileText className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    <span className="truncate text-left">{doc.original_filename}</span>
                  </div>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-[#3b6009] stroke-[3] shrink-0" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
