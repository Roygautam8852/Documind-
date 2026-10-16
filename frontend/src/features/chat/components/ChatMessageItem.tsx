import { Brain, User, AlertCircle } from 'lucide-react'
import { ChatMessage, Citation } from '../types'
import { CitationBadge } from './CitationBadge'

interface ChatMessageItemProps {
  message: ChatMessage
  onSelectCitation: (citation: Citation) => void
}

export function ChatMessageItem({ message, onSelectCitation }: ChatMessageItemProps) {
  const isUser = message.sender === 'user'

  // Map citation_id -> Citation object for inline tag clickability
  const citationMap = new Map<string, Citation>()
  if (message.citations) {
    for (const c of message.citations) {
      citationMap.set(c.citation_id, c)
    }
  }

  // Parse text into string chunks and interactive citation tags like [S1]
  const renderMessageContent = (text: string) => {
    if (isUser) {
      return <p className="whitespace-pre-wrap">{text}</p>
    }

    // Split on [S1], [S2] etc.
    const parts = text.split(/(\[S\d+\])/g)

    return (
      <div className="space-y-2 leading-relaxed">
        <p className="whitespace-pre-wrap">
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
                    onClick={() => onSelectCitation(citation)}
                    className="inline-flex items-center px-1.5 py-0.2 mx-0.5 rounded text-xs font-bold text-brand-300 bg-brand-500/20 hover:bg-brand-500/30 border border-brand-500/30 align-baseline cursor-pointer transition-colors"
                    title={`View source passage for [${tag}]`}
                  >
                    [{tag}]
                  </button>
                )
              }
            }
            return <span key={idx}>{part}</span>
          })}
        </p>
      </div>
    )
  }

  return (
    <div
      className={`flex gap-3.5 p-4 rounded-xl transition-colors ${
        isUser
          ? 'bg-surface-100/60 border border-surface-300/40 ml-8'
          : 'bg-surface-100 border border-surface-300 mr-8 shadow-sm'
      }`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {isUser ? (
          <div className="w-8 h-8 rounded-lg bg-surface-300 flex items-center justify-center text-slate-300">
            <User className="w-4 h-4" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center shadow-sm">
            <Brain className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      {/* Message Body */}
      <div className="flex-1 space-y-2.5 overflow-hidden">
        {/* Header row */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-200">
              {isUser ? 'You' : 'DocuMind'}
            </span>
            {!isUser && message.retrievalStrategy && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-200/80 text-brand-300 border border-surface-300 font-mono">
                {message.retrievalStrategy === 'hybrid' ? 'Hybrid Search' : 'Vector Search'}
                {message.reranked ? ' • Reranked' : ''}
              </span>
            )}
          </div>
          <span>{message.timestamp}</span>
        </div>

        {/* Content */}
        <div className={`text-sm text-slate-200 ${message.isError ? 'text-rose-400' : ''}`}>
          {message.isError && (
            <div className="flex items-center gap-1.5 text-rose-400 mb-1.5 font-medium">
              <AlertCircle className="w-4 h-4" />
              <span>Query Error</span>
            </div>
          )}
          {renderMessageContent(message.text)}
        </div>

        {/* Citations List if present */}
        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="pt-2 mt-2 border-t border-surface-300/60 space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Sources Referenced ({message.citations.length}):
            </span>
            <div className="flex flex-wrap gap-2 pt-0.5">
              {message.citations.map((c) => (
                <CitationBadge
                  key={c.citation_id}
                  citation={c}
                  onClick={onSelectCitation}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
