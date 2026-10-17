import { MessageSquarePlus, MessageSquare, Trash2, Clock } from 'lucide-react'
import { ConversationSummary } from '../types'

interface ConversationSidebarProps {
  conversations: ConversationSummary[]
  activeConversationId: string | null
  isLoading: boolean
  onSelectConversation: (id: string) => void
  onNewChat: () => void
  onDeleteConversation: (id: string) => void
}

export function ConversationSidebar({
  conversations,
  activeConversationId,
  isLoading,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
}: ConversationSidebarProps) {
  return (
    <div className="w-72 bg-surface-100/90 border-r border-white/[0.08] flex flex-col h-full select-none backdrop-blur-md">
      {/* Header action: New Chat */}
      <div className="p-3 border-b border-white/[0.06]">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-brand hover:brightness-110 text-white font-semibold text-sm transition-all shadow-md shadow-brand-500/25 active:scale-95"
          aria-label="Start a new chat"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span>New Chat</span>
        </button>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
          <span>Recent Conversations</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-200/80 text-slate-400">{conversations.length}</span>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 rounded-xl bg-surface-200/50 animate-pulse" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-10 px-4 text-slate-500 text-xs">
            <div className="w-10 h-10 rounded-xl bg-surface-200/60 flex items-center justify-center mx-auto mb-2 text-slate-400">
              <MessageSquare className="w-5 h-5 opacity-60" />
            </div>
            <p className="font-medium text-slate-400">No previous conversations.</p>
            <p className="mt-1 text-[11px] text-slate-500">Ask a question to begin a thread.</p>
          </div>
        ) : (
          conversations.map((conv) => {
            const isActive = conv.id === activeConversationId
            const displayTitle = conv.title || 'Conversation'
            const formattedDate = new Date(conv.updated_at).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
            })

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`group relative flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-brand-500/20 via-brand-500/10 to-transparent text-white font-medium border border-brand-500/30 shadow-sm shadow-brand-500/10'
                    : 'text-slate-300 hover:bg-surface-200/70 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <MessageSquare
                    className={`w-4 h-4 flex-shrink-0 ${
                      isActive ? 'text-brand-400' : 'text-slate-400 group-hover:text-slate-300'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs leading-snug">{displayTitle}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formattedDate}
                      </span>
                      <span>•</span>
                      <span>
                        {conv.message_count} {conv.message_count === 1 ? 'msg' : 'msgs'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteConversation(conv.id)
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 rounded transition-all hover:bg-surface-300/50"
                  title="Delete conversation"
                  aria-label={`Delete conversation: ${displayTitle}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
