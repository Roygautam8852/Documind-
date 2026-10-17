import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { ArrowUp, Loader2, Plus } from 'lucide-react'

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
  placeholder = 'Ask Anything...',
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
    <div className="relative bg-white border border-gray-200/90 rounded-[24px] shadow-lg shadow-black/[0.04] p-3 transition-all focus-within:border-gray-400 focus-within:shadow-xl">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? 'No ready documents. Upload documents first.' : placeholder}
        disabled={disabled || isLoading}
        rows={1}
        className="w-full resize-none bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none px-3 pt-1 pb-2 min-h-[42px] max-h-[180px]"
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

        {/* Right: Audio Waveform & Send Button */}
        <div className="flex items-center gap-2">
          <div className="text-gray-400 text-xs px-2 select-none font-mono" title="Voice assistant ready">
            ılılı
          </div>

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
