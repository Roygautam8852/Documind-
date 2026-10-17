import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Brain,
  MessageSquare,
  FileText,
  BookOpen,
  Search,
  Plus,
  HelpCircle,
  Trash2,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react'
import { useConversations, useDeleteConversation } from '@/features/chat/conversationsApi'
import { AccountControl } from '@/features/auth/AccountControl'

interface EchoSidebarProps {
  onNewChat?: () => void
  activeConversationId?: string | null
  onSelectConversation?: (id: string) => void
}

export function EchoSidebar({
  onNewChat,
  activeConversationId,
  onSelectConversation,
}: EchoSidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')

  const { data: convData, isLoading: isLoadingConvs } = useConversations()
  const deleteConvMutation = useDeleteConversation()

  const conversations = convData?.items || []
  const filteredConversations = conversations.filter((c) =>
    (c.title || 'Conversation').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleStartNewChat = () => {
    if (onNewChat) {
      onNewChat()
    } else {
      navigate('/chat')
    }
  }

  const handleSelect = (id: string) => {
    if (onSelectConversation) {
      onSelectConversation(id)
    } else {
      navigate(`/chat?convId=${id}`)
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await deleteConvMutation.mutateAsync(id)
  }

  return (
    <aside className="w-64 bg-[#111215] border-r border-[#202228] flex flex-col h-full text-slate-200 select-none flex-shrink-0">
      {/* ── Brand Header ────────────────────────────────────────────── */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-[#202228]">
        <Link to="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-black font-bold shadow-sm transition-transform group-hover:scale-105">
            <Brain className="w-4 h-4 text-black" />
          </div>
          <span className="font-bold text-white text-base tracking-tight">DocuMind</span>
        </Link>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#1c1e24] text-slate-400 border border-[#2a2d36]">
          v1.0
        </span>
      </div>

      <div className="p-3 space-y-3">
        {/* ── New Chat Button ─────────────────────────────────────────── */}
        <button
          onClick={handleStartNewChat}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#1c1e24] hover:bg-[#252830] border border-[#2d303a] text-white font-medium text-xs transition-all duration-150 active:scale-[0.98] group shadow-sm"
          id="sidebar-new-chat"
        >
          <div className="flex items-center gap-2">
            <Plus className="w-3.5 h-3.5 text-white" />
            <span>New chat</span>
          </div>
          <kbd className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-[#111215] border border-[#2a2d36]">
            Ctrl N
          </kbd>
        </button>

        {/* ── Search Chat Input ───────────────────────────────────────── */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search chat"
            className="w-full bg-[#16171b] border border-[#262933] text-slate-200 placeholder-slate-400 rounded-xl pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#b6f526] focus:border-transparent transition-all"
          />
        </div>

        {/* ── Main Navigation ─────────────────────────────────────────── */}
        <nav className="space-y-0.5 pt-1">
          <Link
            to="/dashboard"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
              location.pathname === '/dashboard'
                ? 'bg-[#1c1e24] text-white border border-[#2d303a]'
                : 'text-slate-400 hover:text-white hover:bg-[#16171b]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>

          <Link
            to="/documents"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
              location.pathname === '/documents'
                ? 'bg-[#1c1e24] text-white border border-[#2d303a]'
                : 'text-slate-400 hover:text-white hover:bg-[#16171b]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Documents</span>
          </Link>

          <Link
            to="/chat"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
              location.pathname === '/chat'
                ? 'bg-[#1c1e24] text-white border border-[#2d303a]'
                : 'text-slate-400 hover:text-white hover:bg-[#16171b]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat Intelligence</span>
          </Link>
        </nav>
      </div>

      {/* ── Recent Conversations ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1">
        <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
          <span>Recent</span>
          <span className="text-[10px] text-slate-400 font-mono">
            {filteredConversations.length}
          </span>
        </div>

        {isLoadingConvs ? (
          <div className="space-y-1.5 p-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 rounded-xl bg-[#1c1e24]/60 animate-pulse" />
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="py-6 px-2 text-center text-slate-400 text-xs">
            <p>No recent chats</p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isActive = conv.id === activeConversationId
            const title = conv.title || 'Untitled conversation'
            return (
              <div
                key={conv.id}
                onClick={() => handleSelect(conv.id)}
                className={`group relative flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#1c1e24] text-white font-semibold border border-[#2d303a]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#16171b]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-70" />
                  <span className="truncate">{title}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleDelete(e, conv.id)}
                  aria-label="Delete conversation"
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* ── Upgrade Card (Matching user image) ───────────────────────── */}
      <div className="p-3">
        <div className="rounded-2xl bg-[#181a20] border border-[#262933] p-4 text-left shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white mb-1">
            <Sparkles className="w-3.5 h-3.5 text-[#b6f526]" />
            <span>Your trial ends in 7 days</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
            Keep enjoying unlimited chats, detailed reports, and premium AI tools without interruption.
          </p>
          <button
            onClick={() => alert('DocuMind Pro is active on your workspace!')}
            className="w-full bg-[#b6f526] hover:bg-[#a5e61c] text-black font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] shadow-sm shadow-[#b6f526]/20"
          >
            <span>Upgrade</span>
            <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* ── Footer / Help & Account ──────────────────────────────────── */}
      <div className="p-3 border-t border-[#202228] space-y-1">
        <Link
          to="/dashboard"
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-[#16171b] transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Help Center</span>
        </Link>
        <AccountControl />
      </div>
    </aside>
  )
}
