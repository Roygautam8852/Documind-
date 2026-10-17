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
    <div className="relative bg-surface-100/90 backdrop-blur-xl border border-white/[0.1] rounded-2xl shadow-xl shadow-black/20 p-2.5 focus-within:border-brand-500/60 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          disabled
            ? 'No ready documents to query. Please upload documents first.'
            : 'Ask a question about your documents... (Press Enter ↵ to send, Shift+Enter for new line)'
        }
        disabled={disabled || isLoading}
        rows={1}
        className="w-full resize-none bg-transparent text-sm text-slate-100 placeholder-slate-400 focus:outline-none px-3 py-1.5 min-h-[44px] max-h-[200px]"
      />

      <div className="flex items-center justify-between px-3 pt-2 border-t border-white/[0.06] text-xs text-slate-400">
        <span className="text-[11px] text-slate-400">{text.length} / 4000 characters</span>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!text.trim() || isLoading || disabled}
          className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-brand hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100 text-white font-semibold text-xs shadow-md shadow-brand-500/20 transition-all cursor-pointer disabled:cursor-not-allowed active:scale-95"
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
