import { useState } from 'react'
import { Brain, AlertCircle, Copy, Check, ThumbsUp, ThumbsDown, Volume2, RotateCw } from 'lucide-react'
import { ChatMessage, Citation } from '../types'
import { CitationBadge } from './CitationBadge'

interface ChatMessageItemProps {
  message: ChatMessage
  onSelectCitation: (citation: Citation) => void
  onRegenerate?: () => void
}

export function ChatMessageItem({ message, onSelectCitation, onRegenerate }: ChatMessageItemProps) {
  const isUser = message.sender === 'user'
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(null)

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

  const handleSpeak = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(message.text)
      window.speechSynthesis.speak(utterance)
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
              className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md text-[11px] font-bold text-black bg-[#b6f526] hover:bg-[#a5e61c] shadow-sm cursor-pointer transition-all hover:scale-105 active:scale-95 align-baseline"
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
            className="px-1.5 py-0.5 rounded-md bg-[#121316] text-[#b6f526] font-mono text-xs border border-[#2b2d36]"
          >
            {part.slice(1, -1)}
          </code>
        )
      }

      // Bold text **bold**
      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        return (
          <strong key={idx} className={isUser ? 'font-bold text-white' : 'font-semibold text-white'}>
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
      return <p className="whitespace-pre-wrap leading-relaxed text-sm select-text text-gray-100">{text}</p>
    }

    const lines = text.split('\n')
    const elements: JSX.Element[] = []
    let currentList: string[] = []

    const flushList = (keyPrefix: number) => {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`list-${keyPrefix}`} className="my-2 space-y-1.5 pl-1">
            {currentList.map((item, liIdx) => (
              <li key={liIdx} className="flex items-start gap-2.5 text-[#d8d8dc] text-[15px] leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-[#b6f526] mt-2 flex-shrink-0" />
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
          <h3 key={lineIdx} className="text-base font-bold text-white mt-4 mb-1.5 tracking-tight">
            {renderInlineFormatted(trimmed.slice(4))}
          </h3>
        )
      } else if (trimmed.startsWith('## ')) {
        elements.push(
          <h2 key={lineIdx} className="text-lg font-extrabold text-white mt-5 mb-2 tracking-tight">
            {renderInlineFormatted(trimmed.slice(3))}
          </h2>
        )
      } else if (trimmed.startsWith('# ')) {
        elements.push(
          <h1 key={lineIdx} className="text-xl font-extrabold text-white mt-6 mb-2 tracking-tight">
            {renderInlineFormatted(trimmed.slice(2))}
          </h1>
        )
      } else if (trimmed === '---') {
        elements.push(<hr key={lineIdx} className="my-4 border-[#262830]" />)
      } else if (trimmed.length > 0) {
        elements.push(
          <p key={lineIdx} className="text-[15px] text-[#ececed] leading-relaxed my-1.5">
            {renderInlineFormatted(trimmed)}
          </p>
        )
      }
    })

    flushList(lines.length)
    return <div className="space-y-1">{elements}</div>
  }

  // ── USER MESSAGE (ChatGPT style right-aligned compact bubble) ───────────────
  if (isUser) {
    return (
      <div className="flex justify-end w-full animate-fade-in">
        <div className="max-w-[85%] sm:max-w-[70%] bg-[#262831] text-gray-100 px-5 py-3 rounded-[24px] rounded-br-md text-sm shadow-sm leading-relaxed border border-[#353844]">
          {renderMessageContent(message.text)}
        </div>
      </div>
    )
  }

  // ── ASSISTANT MESSAGE (ChatGPT style clean open answer layout) ──────────────
  return (
    <div className="flex flex-col w-full text-left space-y-2.5 animate-fade-in group">
      {/* Model & Source Meta Header */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-[#b6f526] text-black font-bold flex items-center justify-center text-xs shadow-sm">
          <Brain className="w-3.5 h-3.5 text-black" />
        </div>
        <span className="font-bold text-white text-sm">DocuMind</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#b6f526]/15 text-[#b6f526] border border-[#b6f526]/30 font-semibold">
          Gemini 3.7 Flash
        </span>
        {message.retrievalStrategy && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#22242c] text-gray-400 border border-[#2e313b] font-mono">
            {message.retrievalStrategy === 'hybrid' ? 'Hybrid Search' : 'Dense Vector'}
          </span>
        )}
      </div>

      {/* Answer Body */}
      <div className="text-[#ececed] text-[15px] leading-relaxed pl-1 space-y-1">
        {message.isError && (
          <div className="flex items-center gap-1.5 text-rose-400 mb-2 font-medium bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-xl">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Query Error</span>
          </div>
        )}
        {renderMessageContent(message.text)}
      </div>

      {/* Citations section if present */}
      {message.citations && message.citations.length > 0 && (
        <div className="pt-2 pl-1 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-gray-400 mr-1 uppercase tracking-wider">
            Sources:
          </span>
          {message.citations.map((c) => (
            <CitationBadge
              key={c.citation_id}
              citation={c}
              onClick={onSelectCitation}
            />
          ))}
        </div>
      )}

      {/* ChatGPT-style Icon Action Bar */}
      <div className="flex items-center gap-1 pt-1.5 pl-1 text-gray-400">
        <button
          type="button"
          onClick={handleCopy}
          className="p-1.5 rounded-lg hover:bg-[#252731] hover:text-gray-200 transition-colors"
          title="Copy answer"
        >
          {copied ? <Check className="w-4 h-4 text-[#b6f526]" /> : <Copy className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={() => setFeedback(feedback === 'like' ? null : 'like')}
          className={`p-1.5 rounded-lg hover:bg-[#252731] transition-colors ${
            feedback === 'like' ? 'text-[#b6f526] bg-[#b6f526]/15' : 'hover:text-gray-200'
          }`}
          title="Good response"
        >
          <ThumbsUp className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setFeedback(feedback === 'dislike' ? null : 'dislike')}
          className={`p-1.5 rounded-lg hover:bg-[#252731] transition-colors ${
            feedback === 'dislike' ? 'text-rose-400 bg-rose-500/15' : 'hover:text-gray-200'
          }`}
          title="Bad response"
        >
          <ThumbsDown className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleSpeak}
          className="p-1.5 rounded-lg hover:bg-[#252731] hover:text-gray-200 transition-colors"
          title="Read aloud"
        >
          <Volume2 className="w-4 h-4" />
        </button>

        {onRegenerate && (
          <button
            type="button"
            onClick={onRegenerate}
            className="p-1.5 rounded-lg hover:bg-[#252731] hover:text-gray-200 transition-colors"
            title="Regenerate response"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
