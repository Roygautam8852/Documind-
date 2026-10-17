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
      // Fallback or ignore
    }
  }

  const pageLabel =
    citation.page_number !== null ? `Page ${citation.page_number}` : 'Full document text'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="source-snippet-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-surface-100/95 border border-white/[0.1] rounded-2xl shadow-2xl shadow-black/50 p-6 text-slate-200 space-y-4 backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-brand-500/20 text-brand-300 border border-brand-500/30">
              [{citation.citation_id}]
            </span>
            <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
              <FileText className="w-4 h-4 text-brand-400" />
              <span id="source-snippet-title" className="truncate max-w-md">
                {citation.filename}
              </span>
            </div>
            <span className="text-xs text-slate-300 bg-surface-200/80 px-2.5 py-0.5 rounded-full border border-white/[0.05]">
              {pageLabel}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-surface-200 transition-colors"
            aria-label="Close snippet modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Snippet */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Bookmark className="w-3.5 h-3.5 text-brand-400" />
              Verified source passage:
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-slate-400 hover:text-brand-300 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy text</span>
                </>
              )}
            </button>
          </div>

          <div className="p-4 rounded-lg bg-surface-50 border border-surface-300 text-sm text-slate-200 leading-relaxed max-h-96 overflow-y-auto whitespace-pre-wrap font-sans selection:bg-brand-500/30">
            {citation.snippet}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-between items-center text-xs text-slate-400">
          <span>Chunk ID: {citation.chunk_id.slice(0, 8)}...</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-surface-200 hover:bg-surface-300 text-slate-200 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
