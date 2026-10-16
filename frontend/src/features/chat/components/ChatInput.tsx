import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Send, Loader2 } from 'lucide-react'

interface ChatInputProps {
  onSend: (question: string) => void
  isLoading: boolean
  disabled?: boolean
}

export function ChatInput({ onSend, isLoading, disabled = false }: ChatInputProps) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea up to 200px
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [text])

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (!trimmed || isLoading || disabled) return
    onSend(trimmed)
    setText('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="relative bg-surface-100 border border-surface-300 rounded-xl shadow-lg p-2 focus-within:border-brand-500/60 focus-within:ring-1 focus-within:ring-brand-500/30 transition-all">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          disabled
            ? 'No ready documents to query. Please upload documents first.'
            : 'Ask a question about your documents... (Press Enter to send, Shift+Enter for new line)'
        }
        disabled={disabled || isLoading}
        rows={1}
        className="w-full resize-none bg-transparent text-sm text-slate-100 placeholder-slate-400/70 focus:outline-none px-3 py-1.5 min-h-[44px] max-h-[200px] scrollbar-thin"
      />

      <div className="flex items-center justify-between px-3 pt-1 border-t border-surface-300/40 text-xs text-slate-400">
        <span>{text.length} / 4000 characters</span>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!text.trim() || isLoading || disabled}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-400 disabled:opacity-40 disabled:hover:bg-brand-500 text-white font-medium text-xs shadow-sm transition-all cursor-pointer disabled:cursor-not-allowed"
          aria-label="Send message"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Thinking...</span>
            </>
          ) : (
            <>
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
