import { useState } from 'react'
import {
  X,
  Sparkles,
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
import { useSummarizeDocument } from '../api'
import type { DocumentSummaryResponse, SummaryType } from '../types'

interface SummaryModalProps {
  document: DocumentResponse | null
  isOpen: boolean
  onClose: () => void
}

export function SummaryModal({ document, isOpen, onClose }: SummaryModalProps) {
  const navigate = useNavigate()
  const [summaryType, setSummaryType] = useState<SummaryType>('executive')
  const [focus, setFocus] = useState('')
  const [copied, setCopied] = useState(false)
  const [activeSnippet, setActiveSnippet] = useState<Citation | null>(null)
  const [summaryResult, setSummaryResult] = useState<DocumentSummaryResponse | null>(null)

  const summarizeMutation = useSummarizeDocument(document?.id || '')

  if (!isOpen || !document) return null

  const handleGenerate = async () => {
    try {
      const res = await summarizeMutation.mutateAsync({
        summary_type: summaryType,
        focus: focus.trim() || undefined,
      })
      setSummaryResult(res)
    } catch {
      // Error handled by mutation
    }
  }

  const handleCopy = async () => {
    if (!summaryResult) return
    try {
      await navigator.clipboard.writeText(summaryResult.summary)
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
        selectedDocId: document.id,
        conversationId: summaryResult?.conversation_id,
      },
    })
  }

  const citationMap = new Map<string, Citation>()
  if (summaryResult?.citations) {
    for (const c of summaryResult.citations) {
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
        aria-labelledby="summary-modal-title"
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
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 id="summary-modal-title" className="text-base font-semibold text-white">
                  Document Summary
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate max-w-lg">
                  <FileText className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                  <span className="truncate">{document.original_filename}</span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-200 transition-colors"
              aria-label="Close summary modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Controls & Configuration */}
          <div className="p-6 border-b border-surface-300 space-y-4 bg-surface-100">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Summary Format</label>
                <div className="flex items-center gap-1.5 bg-surface-200 p-1 rounded-lg border border-surface-300">
                  <button
                    type="button"
                    onClick={() => setSummaryType('executive')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      summaryType === 'executive'
                        ? 'bg-brand-500 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Executive
                  </button>
                  <button
                    type="button"
                    onClick={() => setSummaryType('detailed')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      summaryType === 'detailed'
                        ? 'bg-brand-500 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Detailed
                  </button>
                  <button
                    type="button"
                    onClick={() => setSummaryType('bullet_points')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      summaryType === 'bullet_points'
                        ? 'bg-brand-500 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Key Takeaways
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={summarizeMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 text-white text-xs font-semibold hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed self-end shadow-md"
              >
                {summarizeMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    {summaryResult ? 'Regenerate' : 'Generate Summary'}
                  </>
                )}
              </button>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="focus-input" className="text-xs font-medium text-slate-300">
                Optional Topic Focus
              </label>
              <input
                id="focus-input"
                type="text"
                placeholder="e.g. key financial metrics, security requirements, pricing model..."
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-surface-200 border border-surface-300 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Results Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {summarizeMutation.isPending && (
              <div className="space-y-4 py-8 text-center">
                <Loader2 className="w-8 h-8 text-brand-400 animate-spin mx-auto" />
                <p className="text-sm text-slate-400">
                  Reading document chunks and synthesizing grounded summary...
                </p>
              </div>
            )}

            {summarizeMutation.isError && (
              <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs space-y-1">
                <p className="font-semibold">Failed to generate summary</p>
                <p>{summarizeMutation.error.message || 'An unexpected error occurred.'}</p>
              </div>
            )}

            {summaryResult && !summarizeMutation.isPending && (
              <div className="space-y-6">
                <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-surface-300">
                  <div className="flex items-center gap-2">
                    <span className="capitalize font-medium text-slate-300">
                      {summaryResult.summary_type.replace('_', ' ')} format
                    </span>
                    <span>•</span>
                    <span>{summaryResult.total_chunks_processed} chunks analyzed</span>
                  </div>
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
                        <span>Copy Summary</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-sm bg-surface-200/50 p-4 rounded-lg border border-surface-300/50">
                  {renderContentWithCitations(summaryResult.summary)}
                </div>

                {/* Sources & Citations */}
                {summaryResult.citations.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      <Bookmark className="w-3.5 h-3.5 text-brand-400" />
                      <span>Referenced Sources ({summaryResult.citations.length})</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {summaryResult.citations.map((c) => (
                        <CitationBadge key={c.citation_id} citation={c} onClick={setActiveSnippet} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!summaryResult && !summarizeMutation.isPending && !summarizeMutation.isError && (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Sparkles className="w-8 h-8 text-brand-400/50 mx-auto" />
                <p className="text-sm font-medium text-slate-300">No summary generated yet</p>
                <p className="text-xs max-w-sm mx-auto text-slate-400">
                  Choose a format and click &quot;Generate Summary&quot; to synthesize this document with verified source citations.
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
