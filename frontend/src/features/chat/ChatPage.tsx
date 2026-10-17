import { useState, useRef, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import {
  Brain,
  RotateCcw,
  ArrowLeft,
} from 'lucide-react'
import { ChatMessage, Citation } from './types'
import { useChatQuery } from './api'
import { useConversation } from './conversationsApi'
import { ChatMessageItem } from './components/ChatMessageItem'
import { ChatInput } from './components/ChatInput'
import { DocumentSelector } from './components/DocumentSelector'
import { SourceSnippetModal } from './components/SourceSnippetModal'
import { EchoSidebar } from '@/app/EchoSidebar'
import { MobileNav } from '@/app/MobileNav'
import { apiClient } from '@/lib/api-client'
import { formatUserDisplayName } from '@/lib/formatters'

export function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null)

  // Listen to docId and convId from URL
  useEffect(() => {
    const docId = searchParams.get('docId')
    if (docId) {
      setSelectedDocId(docId)
    }
    const convId = searchParams.get('convId')
    if (convId) {
      setActiveConversationId(convId)
    }
  }, [searchParams])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const chatMutation = useChatQuery()

  // Get current user profile for display name
  const { data: userProfile } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => apiClient.get<{ id: string; email: string }>('/auth/me'),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const displayName = formatUserDisplayName(userProfile?.email)

  // Load message history when selecting a conversation
  const { data: activeConvDetail } = useConversation(activeConversationId)

  useEffect(() => {
    if (activeConvDetail?.messages) {
      const loaded: ChatMessage[] = activeConvDetail.messages.map((m) => ({
        id: m.id,
        sender: m.role,
        text: m.content,
        citations: m.citations,
        retrievalCount: m.retrieval_metadata?.result_count,
        timestamp: new Date(m.created_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      }))
      setMessages(loaded)
    }
  }, [activeConvDetail])

  // Auto-scroll on new message
  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, chatMutation.isPending])

  const handleNewChat = () => {
    setActiveConversationId(null)
    setMessages([])
    setSearchParams({})
  }

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id)
    setSearchParams({ convId: id })
  }

  const handleSend = async (question: string) => {
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      text: question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMessage])

    try {
      const response = await chatMutation.mutateAsync({
        question,
        document_ids: selectedDocId ? [selectedDocId] : undefined,
        conversation_id: activeConversationId || undefined,
      })

      if (response.conversation_id && response.conversation_id !== activeConversationId) {
        setActiveConversationId(response.conversation_id)
        queryClient.invalidateQueries({ queryKey: ['conversations'] })
      }

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-assistant`,
        sender: 'assistant',
        text: response.answer,
        citations: response.citations,
        retrievalCount: response.retrieval.result_count,
        retrievalStrategy: response.retrieval.retrieval_strategy,
        denseCount: response.retrieval.dense_count,
        lexicalCount: response.retrieval.lexical_count,
        reranked: response.retrieval.reranked,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'An error occurred while querying documents.'
      const errorResponse: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        sender: 'assistant',
        text: `Unable to complete query: ${errorMsg}`,
        isError: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, errorResponse])
    }
  }

  return (
    <div className="flex h-screen bg-[#111215] overflow-hidden selection:bg-[#b6f526] selection:text-black">
      {/* ── Left Sidebar (Dark Obsidian Echo Layout) ────────────────── */}
      <div className="hidden md:flex flex-shrink-0 h-full">
        <EchoSidebar
          onNewChat={handleNewChat}
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
        />
      </div>

      {/* ── Main Workspace Card ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full bg-[#111215] p-0 md:p-3 overflow-hidden">
        <MobileNav />

        {/* Crisp White Inner Container (EchoAI Chat Frame) */}
        <div className="flex-1 flex flex-col bg-white rounded-none md:rounded-[28px] border border-gray-200/90 shadow-2xl overflow-hidden">
          {/* Top Bar */}
          <header className="h-16 border-b border-gray-200/80 px-4 sm:px-6 flex items-center justify-between flex-shrink-0 bg-white">
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-black font-semibold text-xs transition-all shadow-sm active:scale-95"
                title="Back to Landing Page"
                aria-label="Back to Landing Page"
              >
                <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">Landing Page</span>
              </Link>
              <span className="text-gray-300">|</span>
              <div className="flex items-center gap-1.5 font-bold text-gray-900 text-sm">
                <span>DocuMind 1.0</span>
                <span className="text-xs text-gray-400">⌵</span>
              </div>
              <span className="text-gray-300">|</span>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#b6f526]/25 border border-[#b6f526]/40 text-xs font-semibold text-[#3b6009]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3b6009] animate-pulse" />
                Gemini 3.7 Flash
              </div>
            </div>

            {/* Scope / Selector in center on desktop */}
            <div className="hidden lg:flex items-center">
              <DocumentSelector
                selectedDocId={selectedDocId}
                onSelectDocId={setSelectedDocId}
              />
            </div>

            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleNewChat}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-600 hover:text-black hover:bg-gray-100 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear view</span>
                </button>
              )}


              <div
                className="w-8 h-8 rounded-full bg-[#b6f526] text-black font-bold flex items-center justify-center text-xs shadow-sm cursor-pointer"
                title={displayName}
              >
                {displayName.slice(0, 2).toUpperCase()}
              </div>
            </div>
          </header>

          {/* Scope bar on small screens */}
          <div className="lg:hidden px-4 py-2 border-b border-gray-100 bg-gray-50/50">
            <DocumentSelector
              selectedDocId={selectedDocId}
              onSelectDocId={setSelectedDocId}
            />
          </div>

          {/* ── Content Area: Empty State vs Message History ───────── */}
          {messages.length === 0 ? (
            <div className="flex-1 overflow-y-auto flex flex-col justify-center items-center px-4 sm:px-8 py-8">
              <div className="w-full max-w-2xl space-y-6 text-center animate-fade-in">
                {/* Hero Greeting Heading */}
                <div className="space-y-2">
                  <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
                    Hello, {displayName}
                  </h1>
                  <p className="text-xl sm:text-2xl font-medium text-gray-500">
                    Let's make your research easier.
                  </p>
                  <p className="text-xs sm:text-sm text-gray-400">
                    Your personal AI assistant for documents, research, and verified knowledge.
                  </p>
                </div>

                {/* Central Floating Prompt Input Box */}
                <div className="text-left w-full">
                  <ChatInput
                    onSend={handleSend}
                    isLoading={chatMutation.isPending}
                    placeholder="Ask DocuMind anything..."
                  />
                  <p className="text-[11px] text-gray-400 text-center mt-2.5 select-none">
                    DocuMind can make mistakes. Verify important info from source documents.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Active Message Stream (ChatGPT centered format) */
            <div className="flex-1 flex flex-col overflow-hidden bg-white">
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
                <div className="max-w-3xl mx-auto w-full space-y-7 pb-4">
                  {messages.map((message) => (
                    <ChatMessageItem
                      key={message.id}
                      message={message}
                      onSelectCitation={setActiveCitation}
                      onRegenerate={() => {
                        const lastUser = [...messages].reverse().find((m) => m.sender === 'user')
                        if (lastUser) handleSend(lastUser.text)
                      }}
                    />
                  ))}

                  {chatMutation.isPending && (
                    <div className="flex items-center gap-2.5 text-gray-500 text-sm animate-pulse pl-1">
                      <div className="w-6 h-6 rounded-lg bg-[#b6f526] text-black font-bold flex items-center justify-center text-xs shadow-sm">
                        <Brain className="w-3.5 h-3.5 text-black animate-spin" />
                      </div>
                      <span className="font-medium text-gray-600">DocuMind is thinking and synthesizing sources...</span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Bottom Fixed Floating Input Bar (ChatGPT centered layout) */}
              <div className="p-4 bg-white/95 backdrop-blur-md border-t border-gray-100">
                <div className="max-w-3xl mx-auto w-full">
                  <ChatInput
                    onSend={handleSend}
                    isLoading={chatMutation.isPending}
                    placeholder="Ask a follow-up question..."
                  />
                  <p className="text-[11px] text-gray-400 text-center mt-2 select-none">
                    DocuMind can make mistakes. Verify important info from source documents.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Citation Snippet Modal ───────────────────────────────────── */}
      <SourceSnippetModal
        citation={activeCitation}
        onClose={() => setActiveCitation(null)}
      />
    </div>
  )
}
