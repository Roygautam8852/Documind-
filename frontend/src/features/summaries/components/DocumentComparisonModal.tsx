import { useState } from 'react'
import {
  X,
  Layers,
  FileText,
  Copy,
  Check,
  MessageSquare,
  Loader2,
  Bookmark,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { DocumentResponse } from '@/features/documents/types'
import type { Citation } from '@/features/chat/types'
import { SourceSnippetModal } from '@/features/chat/components/SourceSnippetModal'
import { CitationBadge } from '@/features/chat/components/CitationBadge'
import { useCompareDocuments } from '../api'
import type { MultiDocComparisonResponse } from '../types'

interface DocumentComparisonModalProps {
  documents: DocumentResponse[]
  isOpen: boolean
  onClose: () => void
}

export function DocumentComparisonModal({
  documents,
  isOpen,
  onClose,
}: DocumentComparisonModalProps) {
  const navigate = useNavigate()
  const [focus, setFocus] = useState('')
  const [copied, setCopied] = useState(false)
  const [activeSnippet, setActiveSnippet] = useState<Citation | null>(null)
  const [comparisonResult, setComparisonResult] = useState<MultiDocComparisonResponse | null>(null)

  const compareMutation = useCompareDocuments()

  if (!isOpen || documents.length < 2) return null

  const handleCompare = async () => {
    try {
      const res = await compareMutation.mutateAsync({
        document_ids: documents.map((d) => d.id),
        focus: focus.trim() || undefined,
      })
      setComparisonResult(res)
    } catch {
      // Error handled by react-query
    }
  }

  const handleCopy = async () => {
    if (!comparisonResult) return
    try {
      await navigator.clipboard.writeText(comparisonResult.comparison)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Ignore
    }
  }

  const handleOpenInChat = () => {
    onClose()
    navigate('/chat', {
      state: {
        selectedDocIds: documents.map((d) => d.id),
        conversationId: comparisonResult?.conversation_id,
      },
    })
  }

  const citationMap = new Map<string, Citation>()
  if (comparisonResult?.citations) {
    for (const c of comparisonResult.citations) {
      citationMap.set(c.citation_id, c)
    }
  }

  const renderContentWithCitations = (text: string) => {
    const parts = text.split(/(\[S\d+\])/g)
    return (
      <p className="whitespace-pre-wrap leading-relaxed text-slate-200">
        {parts.map((part, idx) => {
          const match = part.match(/^\[(S\d+)\]$/)
          if (match) {
            const tag = match[1]
            const citation = citationMap.get(tag)
            if (citation) {
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveSnippet(citation)}
                  className="inline-flex items-center px-1.5 py-0.2 mx-0.5 rounded text-xs font-bold text-brand-300 bg-brand-500/20 hover:bg-brand-500/30 border border-brand-500/30 align-baseline cursor-pointer transition-colors"
                  title={`View source citation [${tag}]`}
                >
                  [{tag}]
                </button>
              )
            }
          }
          return <span key={idx}>{part}</span>
        })}
      </p>
    )
  }

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="comparison-modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      >
        <div
          className="w-full max-w-3xl max-h-[85vh] bg-surface-100 border border-surface-300 rounded-xl shadow-2xl flex flex-col text-slate-200 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-300 bg-surface-150">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h2 id="comparison-modal-title" className="text-base font-semibold text-white">
                  Multi-Document Comparison
                </h2>
                <p className="text-xs text-slate-400">
                  Synthesizing and contrasting {documents.length} documents
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-200 transition-colors"
              aria-label="Close comparison modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Document Pills & Configuration */}
          <div className="p-6 border-b border-surface-300 space-y-4 bg-surface-100">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Selected Documents</label>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {documents.map((doc) => (
                  <span
                    key={doc.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-200 border border-surface-300 text-xs text-slate-300 truncate max-w-xs"
                  >
                    <FileText className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                    <span className="truncate">{doc.original_filename}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
              <div className="flex-1 space-y-1.5">
                <label htmlFor="comparison-focus-input" className="text-xs font-medium text-slate-300">
                  Comparison Focus / Angle (Optional)
                </label>
                <input
                  id="comparison-focus-input"
                  type="text"
                  placeholder="e.g. pricing discrepancies, architectural differences, SLA clauses..."
                  value={focus}
                  onChange={(e) => setFocus(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-surface-200 border border-surface-300 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <button
                type="button"
                onClick={handleCompare}
                disabled={compareMutation.isPending}
                className="flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-brand-500 text-white text-xs font-semibold hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shrink-0"
              >
                {compareMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Comparing...
                  </>
                ) : (
                  <>
                    <Layers className="w-3.5 h-3.5" />
                    {comparisonResult ? 'Re-compare' : 'Compare Documents'}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {compareMutation.isPending && (
              <div className="space-y-4 py-8 text-center">
                <Loader2 className="w-8 h-8 text-brand-400 animate-spin mx-auto" />
                <p className="text-sm text-slate-400">
                  Cross-referencing documents and synthesizing comparative analysis...
                </p>
              </div>
            )}

            {compareMutation.isError && (
              <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs space-y-1">
                <p className="font-semibold">Failed to compare documents</p>
                <p>{compareMutation.error.message || 'An unexpected error occurred.'}</p>
              </div>
            )}

            {comparisonResult && !compareMutation.isPending && (
              <div className="space-y-6">
                <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-surface-300">
                  <span>
                    Compared {comparisonResult.documents_compared.length} documents
                    {comparisonResult.focus ? ` • Focus: "${comparisonResult.focus}"` : ''}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Analysis</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-sm bg-surface-200/50 p-4 rounded-lg border border-surface-300/50">
                  {renderContentWithCitations(comparisonResult.comparison)}
                </div>

                {/* Sources & Citations */}
                {comparisonResult.citations.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      <Bookmark className="w-3.5 h-3.5 text-brand-400" />
                      <span>Cross-Document Citations ({comparisonResult.citations.length})</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {comparisonResult.citations.map((c) => (
                        <CitationBadge key={c.citation_id} citation={c} onClick={setActiveSnippet} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!comparisonResult && !compareMutation.isPending && !compareMutation.isError && (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Layers className="w-8 h-8 text-brand-400/50 mx-auto" />
                <p className="text-sm font-medium text-slate-300">Ready to compare</p>
                <p className="text-xs max-w-sm mx-auto text-slate-400">
                  Click &quot;Compare Documents&quot; to synthesize commonalities, differences, and specific claims backed by citations.
                </p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-surface-300 bg-surface-150">
            <button
              type="button"
              onClick={handleOpenInChat}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-surface-200 border border-surface-300 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5 text-brand-400" />
              Continue in Chat
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-surface-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {activeSnippet && (
        <SourceSnippetModal citation={activeSnippet} onClose={() => setActiveSnippet(null)} />
      )}
    </>
  )
}
