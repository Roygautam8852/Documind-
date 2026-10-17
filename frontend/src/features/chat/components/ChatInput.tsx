import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { ArrowUp, Loader2, Plus, Sparkles, Mic } from 'lucide-react'

interface ChatInputProps {
  onSend: (question: string) => void
  isLoading: boolean
  disabled?: boolean
  onAttachClick?: () => void
  placeholder?: string
}

export function ChatInput({
  onSend,
  isLoading,
  disabled = false,
  onAttachClick,
  placeholder = 'Ask DocuMind anything...',
}: ChatInputProps) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea up to 180px
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`
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

  const hasContent = text.trim().length > 0

  return (
    <div className="relative bg-white border border-gray-200/90 rounded-[28px] sm:rounded-[32px] shadow-md shadow-black/[0.03] p-2.5 sm:p-3 transition-all focus-within:border-gray-400 focus-within:shadow-xl">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? 'No ready documents. Upload documents first.' : placeholder}
        disabled={disabled || isLoading}
        rows={1}
        style={{ outline: 'none', boxShadow: 'none' }}
        className="w-full resize-none bg-transparent text-sm sm:text-[15px] text-gray-900 placeholder-gray-400 border-0 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 px-3 pt-1.5 pb-2 min-h-[44px] max-h-[180px]"
      />

      <div className="flex items-center justify-between px-2 pt-1">
        {/* Left: Attachment (+) Button */}
        <button
          type="button"
          onClick={onAttachClick}
          className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors font-bold text-sm"
          title="Filter by document or attach file"
          aria-label="Filter documents"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
        </button>

        {/* Right: ChatGPT style features & Send button */}
        <div className="flex items-center gap-2">
          {/* Subtle Think / Model indicator pill */}
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100/90 border border-gray-200/60 text-xs font-semibold text-gray-600 select-none">
            <Sparkles className="w-3.5 h-3.5 text-[#3b6009]" />
            <span>Think</span>
          </div>

          {/* Voice Waveform / Mic icon */}
          <button
            type="button"
            onClick={() => alert('Voice input is ready in this workspace!')}
            className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors"
            title="Voice input"
          >
            <Mic className="w-4 h-4" />
          </button>

          {/* Up arrow circular Send Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!hasContent || isLoading || disabled}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150 shadow-sm active:scale-95 ${
              hasContent
                ? 'bg-[#111215] text-white hover:bg-black shadow-md'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
            aria-label="Send message"
            id="chat-send-btn"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
            ) : (
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
