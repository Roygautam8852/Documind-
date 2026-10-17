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
    <div className="relative bg-[#21232a] border border-[#2e313c] rounded-[28px] sm:rounded-[32px] shadow-lg shadow-black/20 p-2.5 sm:p-3 transition-all focus-within:border-[#424654] focus-within:shadow-2xl">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? 'No ready documents. Upload documents first.' : placeholder}
        disabled={disabled || isLoading}
        rows={1}
        style={{ outline: 'none', boxShadow: 'none' }}
        className="w-full resize-none bg-transparent text-sm sm:text-[15px] text-white placeholder-gray-400 border-0 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 px-3 pt-1.5 pb-2 min-h-[44px] max-h-[180px]"
      />

      <div className="flex items-center justify-between px-2 pt-1">
        {/* Left: Attachment (+) Button */}
        <button
          type="button"
          onClick={onAttachClick}
          className="w-8 h-8 rounded-full bg-[#2c2f39] hover:bg-[#373b47] text-gray-300 hover:text-white flex items-center justify-center transition-colors font-bold text-sm"
          title="Filter by document or attach file"
          aria-label="Filter documents"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
        </button>

        {/* Right: ChatGPT style features & Send button */}
        <div className="flex items-center gap-2">
          {/* Subtle Think / Model indicator pill */}
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2a2d37] border border-[#373a46] text-xs font-semibold text-gray-300 select-none">
            <Sparkles className="w-3.5 h-3.5 text-[#b6f526]" />
            <span>Think</span>
          </div>

          {/* Voice Waveform / Mic icon */}
          <button
            type="button"
            onClick={() => alert('Voice input is ready in this workspace!')}
            className="w-8 h-8 rounded-full hover:bg-[#2c2f39] text-gray-400 hover:text-gray-200 flex items-center justify-center transition-colors"
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
                ? 'bg-[#b6f526] text-black hover:bg-[#a5e61c] shadow-md shadow-[#b6f526]/20 font-bold'
                : 'bg-[#2c2f39] text-gray-600 cursor-not-allowed'
            }`}
            aria-label="Send message"
            id="chat-send-btn"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-black" />
            ) : (
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
