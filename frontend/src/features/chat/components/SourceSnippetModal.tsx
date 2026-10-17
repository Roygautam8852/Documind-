import { X, FileText, Bookmark, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { Citation } from '../types'

interface SourceSnippetModalProps {
  citation: Citation | null
  onClose: () => void
}

export function SourceSnippetModal({ citation, onClose }: SourceSnippetModalProps) {
  const [copied, setCopied] = useState(false)

  if (!citation) return null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(citation.snippet)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  const pageLabel =
    citation.page_number !== null ? `Page ${citation.page_number}` : 'Full document text'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="source-snippet-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#1c1e25] border border-[#2d303c] rounded-[28px] shadow-2xl p-6 text-white space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2d303c]">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-[#b6f526] text-black">
              [{citation.citation_id}]
            </span>
            <div className="flex items-center gap-1.5 text-sm font-bold text-white">
              <FileText className="w-4 h-4 text-gray-400" />
              <span id="source-snippet-title" className="truncate max-w-md">
                {citation.filename}
              </span>
            </div>
            <span className="text-xs text-gray-300 bg-[#262833] px-2.5 py-0.5 rounded-full font-mono">
              {pageLabel}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-xl text-gray-400 hover:text-white hover:bg-[#282a36] transition-colors"
            aria-label="Close snippet modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Snippet */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="flex items-center gap-1 font-semibold text-gray-300">
              <Bookmark className="w-3.5 h-3.5 text-[#b6f526]" />
              Verified source passage:
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-gray-400 hover:text-white font-semibold transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#b6f526]" />
                  <span className="text-[#b6f526]">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy text</span>
                </>
              )}
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-[#131418] border border-[#282a35] text-sm text-[#d8d8de] leading-relaxed max-h-96 overflow-y-auto whitespace-pre-wrap font-sans selection:bg-[#b6f526]/30">
            {citation.snippet}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-between items-center text-xs text-gray-400">
          <span className="font-mono">Chunk ID: {citation.chunk_id.slice(0, 8)}...</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#282a35] hover:bg-[#343745] text-white text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
