import { useState } from 'react'
import { Brain, User, AlertCircle, Copy, Check } from 'lucide-react'
import { ChatMessage, Citation } from '../types'
import { CitationBadge } from './CitationBadge'

interface ChatMessageItemProps {
  message: ChatMessage
  onSelectCitation: (citation: Citation) => void
}

export function ChatMessageItem({ message, onSelectCitation }: ChatMessageItemProps) {
  const isUser = message.sender === 'user'
  const [copied, setCopied] = useState(false)

  // Map citation_id -> Citation object for inline tag clickability
  const citationMap = new Map<string, Citation>()
  if (message.citations) {
    for (const c of message.citations) {
      citationMap.set(c.citation_id, c)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  // Parse inline text containing bold, code, and [S1] citation tags
  const renderInlineFormatted = (inlineText: string) => {
    // Regex matches: [S\d+], `code`, **bold**
    const tokenRegex = /(\[S\d+\]|`[^`]+`|\*\*[^*]+\*\*)/g
    const parts = inlineText.split(tokenRegex)

    return parts.map((part, idx) => {
      // Citation tag [S1]
      const citationMatch = part.match(/^\[(S\d+)\]$/)
      if (citationMatch) {
        const tag = citationMatch[1]
        const citation = citationMap.get(tag)
        if (citation) {
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectCitation(citation)}
              className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded text-xs font-semibold text-brand-300 bg-brand-500/15 hover:bg-brand-500/30 border border-brand-500/30 shadow-sm align-baseline cursor-pointer transition-all hover:scale-105"
              title={`View citation [${tag}] from ${citation.filename}`}
            >
              [{tag}]
            </button>
          )
        }
      }

      // Inline code `code`
      if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
        return (
          <code key={idx} className="px-1.5 py-0.5 rounded bg-surface-300/70 text-brand-300 font-mono text-xs border border-white/[0.05]">
            {part.slice(1, -1)}
          </code>
        )
      }

      // Bold text **bold**
      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        return (
          <strong key={idx} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        )
      }

      return <span key={idx}>{part}</span>
    })
  }

  // Parse text into structured markdown paragraphs, headings, and lists
  const renderMessageContent = (text: string) => {
    if (isUser) {
      return <p className="whitespace-pre-wrap leading-relaxed text-slate-100">{text}</p>
    }

    const lines = text.split('\n')
    const elements: JSX.Element[] = []
    let currentList: string[] = []

    const flushList = (keyPrefix: number) => {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`list-${keyPrefix}`} className="my-2 space-y-1.5 pl-1">
            {currentList.map((item, liIdx) => (
              <li key={liIdx} className="flex items-start gap-2.5 text-slate-200 text-sm leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-2 flex-shrink-0" />
                <span className="flex-1">{renderInlineFormatted(item)}</span>
              </li>
            ))}
          </ul>
        )
        currentList = []
      }
    }

    lines.forEach((line, idx) => {
      const trimmed = line.trim()

      if (!trimmed) {
        flushList(idx)
        return
      }

      // Divider
      if (trimmed === '---' || trimmed === '***') {
        flushList(idx)
        elements.push(<hr key={idx} className="border-surface-300/60 my-3" />)
        return
      }

      // H3 Heading: ### Title
      if (trimmed.startsWith('### ')) {
        flushList(idx)
        elements.push(
          <h3 key={idx} className="text-base font-bold text-brand-300 mt-3.5 mb-1.5 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-brand-400 inline-block" />
            {renderInlineFormatted(trimmed.slice(4))}
          </h3>
        )
        return
      }

      // H2 Heading: ## Title
      if (trimmed.startsWith('## ')) {
        flushList(idx)
        elements.push(
          <h2 key={idx} className="text-lg font-bold text-white mt-4 mb-2">
            {renderInlineFormatted(trimmed.slice(3))}
          </h2>
        )
        return
      }

      // Bullet item: * or -
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
        const itemContent = trimmed.replace(/^[\*\-•]\s*/, '')
        currentList.push(itemContent)
        return
      }

      // Numbered item: 1. Item
      const numMatch = trimmed.match(/^(\d+)\.\s*(.*)/)
      if (numMatch) {
        flushList(idx)
        elements.push(
          <div key={idx} className="flex items-start gap-2.5 my-1.5 text-sm leading-relaxed text-slate-200">
            <span className="text-xs font-bold text-brand-400 bg-brand-500/15 px-1.5 py-0.5 rounded border border-brand-500/20 flex-shrink-0 mt-0.5">
              {numMatch[1]}
            </span>
            <div className="flex-1">{renderInlineFormatted(numMatch[2])}</div>
          </div>
        )
        return
      }

      // Standard paragraph
      flushList(idx)
      elements.push(
        <p key={idx} className="my-1.5 leading-relaxed text-slate-200 text-sm">
          {renderInlineFormatted(trimmed)}
        </p>
      )
    })

    flushList(lines.length)
    return <div className="space-y-1">{elements}</div>
  }

  return (
    <div
      className={`group relative flex gap-3.5 p-4 rounded-2xl transition-all duration-200 ${
        isUser
          ? 'bg-gradient-to-br from-brand-900/30 via-surface-100/80 to-surface-100/90 border border-brand-500/20 ml-6 sm:ml-12 shadow-md shadow-brand-950/20'
          : 'bg-surface-100/80 border border-white/[0.08] mr-6 sm:mr-12 shadow-lg shadow-black/20 backdrop-blur-md hover:border-surface-300'
      }`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {isUser ? (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-brand-600/30">
            <User className="w-4 h-4" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-xl bg-gradient-brand flex items-center justify-center text-white shadow-md shadow-brand-500/30">
            <Brain className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Message Body */}
      <div className="flex-1 space-y-2.5 overflow-hidden">
        {/* Header row */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-100">
              {isUser ? 'You' : 'DocuMind AI'}
            </span>
            {!isUser && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Gemini 3.8 Flash
              </span>
            )}
            {!isUser && message.retrievalStrategy && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-200/80 text-slate-300 border border-surface-300 font-mono">
                {message.retrievalStrategy === 'hybrid' ? 'Hybrid Search' : 'Dense Vector'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span>{message.timestamp}</span>
            {/* Copy Button */}
            {!isUser && (
              <button
                type="button"
                onClick={handleCopy}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-surface-200 text-slate-400 hover:text-slate-200"
                title="Copy response"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className={`text-sm ${message.isError ? 'text-rose-400' : ''}`}>
          {message.isError && (
            <div className="flex items-center gap-1.5 text-rose-400 mb-2 font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Query Error</span>
            </div>
          )}
          {renderMessageContent(message.text)}
        </div>

        {/* Citations List if present */}
        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="pt-3 mt-3 border-t border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                Verified Sources ({message.citations.length}):
              </span>
              <span className="text-[10px] text-slate-400">Click to view excerpt</span>
            </div>
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

