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
              className="inline-flex items-center px-2 py-0.5 mx-0.5 rounded-lg text-xs font-extrabold text-black bg-[#b6f526] hover:bg-[#a5e61c] shadow-sm cursor-pointer transition-all hover:scale-105 active:scale-95"
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
          <code
            key={idx}
            className="px-1.5 py-0.5 rounded-md bg-gray-100 text-[#3b6009] font-mono text-xs border border-gray-200"
          >
            {part.slice(1, -1)}
          </code>
        )
      }

      // Bold text **bold**
      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        return (
          <strong key={idx} className={isUser ? 'font-bold text-white' : 'font-bold text-gray-900'}>
            {part.slice(2, -2)}
          </strong>
        )
      }

      return <span key={idx}>{part}</span>
    })
  }

  // Parse text into structured paragraphs, headings, and lists
  const renderMessageContent = (text: string) => {
    if (isUser) {
      return <p className="whitespace-pre-wrap leading-relaxed text-slate-100 text-sm">{text}</p>
    }

    const lines = text.split('\n')
    const elements: JSX.Element[] = []
    let currentList: string[] = []

    const flushList = (keyPrefix: number) => {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`list-${keyPrefix}`} className="my-2 space-y-1.5 pl-1">
            {currentList.map((item, liIdx) => (
              <li key={liIdx} className="flex items-start gap-2.5 text-gray-800 text-sm leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3b6009] mt-2 flex-shrink-0" />
                <span className="flex-1">{renderInlineFormatted(item)}</span>
              </li>
            ))}
          </ul>
        )
        currentList = []
      }
    }

    lines.forEach((line, lineIdx) => {
      const trimmed = line.trim()

      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        currentList.push(trimmed.slice(2))
        return
      }

      flushList(lineIdx)

      if (trimmed.startsWith('### ')) {
        elements.push(
          <h3 key={lineIdx} className="text-base font-bold text-gray-900 mt-4 mb-1.5 tracking-tight">
            {renderInlineFormatted(trimmed.slice(4))}
          </h3>
        )
      } else if (trimmed.startsWith('## ')) {
        elements.push(
          <h2 key={lineIdx} className="text-lg font-extrabold text-gray-900 mt-5 mb-2 tracking-tight">
            {renderInlineFormatted(trimmed.slice(3))}
          </h2>
        )
      } else if (trimmed.startsWith('# ')) {
        elements.push(
          <h1 key={lineIdx} className="text-xl font-extrabold text-gray-900 mt-6 mb-2 tracking-tight">
            {renderInlineFormatted(trimmed.slice(2))}
          </h1>
        )
      } else if (trimmed === '---') {
        elements.push(<hr key={lineIdx} className="my-4 border-gray-200" />)
      } else if (trimmed.length > 0) {
        elements.push(
          <p key={lineIdx} className="text-sm text-gray-800 leading-relaxed my-1.5">
            {renderInlineFormatted(trimmed)}
          </p>
        )
      }
    })

    flushList(lines.length)
    return <div className="space-y-0.5">{elements}</div>
  }

  return (
    <div
      className={`group relative flex gap-3.5 p-5 rounded-2xl transition-all duration-200 ${
        isUser
          ? 'bg-[#111215] text-white border border-[#202228] ml-6 sm:ml-16 shadow-md'
          : 'bg-white border border-gray-200/90 mr-6 sm:mr-16 shadow-sm hover:border-gray-300'
      }`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {isUser ? (
          <div className="w-8 h-8 rounded-xl bg-[#1c1e24] border border-[#2d303a] flex items-center justify-center text-white">
            <User className="w-4 h-4" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-xl bg-[#b6f526] text-black font-bold flex items-center justify-center shadow-sm">
            <Brain className="w-4 h-4 text-black" />
          </div>
        )}
      </div>

      {/* Message Body */}
      <div className="flex-1 space-y-2.5 overflow-hidden">
        {/* Header row */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <span className={`font-bold ${isUser ? 'text-white' : 'text-gray-900'}`}>
              {isUser ? 'You' : 'DocuMind'}
            </span>
            {!isUser && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[#b6f526]/20 text-[#3b6009] border border-[#b6f526]/40 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3b6009] animate-pulse" />
                Gemini 3.8 Flash
              </span>
            )}
            {!isUser && message.retrievalStrategy && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200 font-mono">
                {message.retrievalStrategy === 'hybrid' ? 'Hybrid Search' : 'Dense Vector'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px]">{message.timestamp}</span>
            {/* Copy Button */}
            {!isUser && (
              <button
                type="button"
                onClick={handleCopy}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                title="Copy response"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#3b6009]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className={`text-sm ${message.isError ? 'text-rose-600' : ''}`}>
          {message.isError && (
            <div className="flex items-center gap-1.5 text-rose-600 mb-2 font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Query Error</span>
            </div>
          )}
          {renderMessageContent(message.text)}
        </div>

        {/* Citations List if present */}
        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="pt-3 mt-3 border-t border-gray-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#b6f526]" />
                Sources Referenced ({message.citations.length}):
              </span>
              <span className="text-[10px] text-gray-400">Click to view source excerpt</span>
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
