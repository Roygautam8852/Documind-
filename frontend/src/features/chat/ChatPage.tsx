import { useState, useRef, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Brain, BookOpen, FileText, MessageSquare, Sparkles, RefreshCw } from 'lucide-react'
import { ChatMessage, Citation } from './types'
import { useChatQuery } from './api'
import { useConversations, useConversation, useDeleteConversation } from './conversationsApi'
import { ChatMessageItem } from './components/ChatMessageItem'
import { ChatInput } from './components/ChatInput'
import { DocumentSelector } from './components/DocumentSelector'
import { SourceSnippetModal } from './components/SourceSnippetModal'
import { ConversationSidebar } from './components/ConversationSidebar'
import { AccountControl } from '@/features/auth/AccountControl'
import { MobileNav } from '@/app/MobileNav'

export function ChatPage() {
  const [searchParams] = useSearchParams()
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null)

  useEffect(() => {
    const docId = searchParams.get('docId')
    if (docId) {
      setSelectedDocId(docId)
    }
  }, [searchParams])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const chatMutation = useChatQuery()

  // Conversations query & mutations
  const { data: convData, isLoading: isLoadingConvs } = useConversations()
  const { data: activeConvDetail } = useConversation(activeConversationId)
  const deleteConvMutation = useDeleteConversation()

  // Load message history when selecting a conversation
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

  // Auto-scroll on new message or loading state
  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, chatMutation.isPending])

  const handleNewChat = () => {
    setActiveConversationId(null)
    setMessages([])
  }

  const handleSelectConversation = (id: string) => {
    if (id !== activeConversationId) {
      setActiveConversationId(id)
    }
  }

  const handleDeleteConversation = async (id: string) => {
    await deleteConvMutation.mutateAsync(id)
    if (activeConversationId === id) {
      handleNewChat()
    }
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

  const handleSuggestion = (prompt: string) => {
    handleSend(prompt)
  }

  return (
    <div className="min-h-screen bg-surface-50 text-slate-200">
      <MobileNav />
      {/* ── App Navigation Sidebar ───────────────────────────────────── */}
      <div className="hidden md:flex fixed inset-y-0 left-0 w-56 bg-surface-100 border-r border-surface-300 flex-col z-20">
        <div className="flex items-center gap-2 px-4 h-16 border-b border-surface-300">
          <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white">DocuMind</span>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <Link
            to="/dashboard"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-surface-200 text-sm font-medium transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            Dashboard
          </Link>
          <Link
            to="/documents"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-surface-200 text-sm font-medium transition-colors"
          >
            <FileText className="w-4 h-4" />
            Documents
          </Link>
          <Link
            to="/chat"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-brand-500/10 text-brand-300 text-sm font-medium"
          >
            <MessageSquare className="w-4 h-4" />
            Chat
          </Link>
        </nav>

        <div className="p-3 border-t border-surface-300">
          <AccountControl />
        </div>
      </div>

      {/* ── Main Workspace ───────────────────────────────────────────── */}
      <div className="pl-0 md:pl-56 flex h-[calc(100vh-3.5rem)] md:h-screen overflow-hidden">
        {/* Conversation History Sidebar */}
        <ConversationSidebar
          conversations={convData?.items || []}
          activeConversationId={activeConversationId}
          isLoading={isLoadingConvs}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          onDeleteConversation={handleDeleteConversation}
        />

        {/* Active Chat Conversation Area */}
        <div className="flex-1 flex flex-col h-full min-w-0">
          {/* Top Header */}
          <header className="h-16 border-b border-surface-300 px-6 flex items-center justify-between bg-surface-50/80 backdrop-blur-sm z-10 flex-shrink-0">
            <div className="flex items-center gap-3">
              <h1 className="font-bold text-lg text-white">Chat Intelligence</h1>
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Gemini 3.8 Flash
              </span>
            </div>

            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMessages([])}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-slate-300 hover:text-white bg-surface-200/60 hover:bg-surface-200 border border-white/[0.05] transition-all"
                  title="Clear current conversation view"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Clear view</span>
                </button>
              )}
            </div>
          </header>

          {/* Scope Selector Bar */}
          <div className="px-6 py-2.5 border-b border-surface-300/40 bg-surface-100/30 flex-shrink-0">
            <DocumentSelector
              selectedDocId={selectedDocId}
              onSelectDocId={setSelectedDocId}
            />
          </div>

          {/* Message Stream */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-4 bg-ambient">
            {messages.length === 0 ? (
              /* Empty State */
              <div className="max-w-2xl mx-auto py-10 text-center space-y-6 animate-fade-in">
                <div className="w-16 h-16 rounded-2xl bg-gradient-brand/10 border border-brand-500/30 flex items-center justify-center mx-auto text-brand-400 shadow-xl shadow-brand-500/10">
                  <Sparkles className="w-8 h-8 text-brand-400" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    Ask anything about your documents
                  </h2>
                  <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                    Powered by semantic hybrid search and Gemini 3.8 Flash. Every claim is verified with clickable citations.
                  </p>
                </div>

                {/* Suggestions Grid */}
                <div className="pt-4 space-y-3 max-w-xl mx-auto">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block text-left pl-1">
                    Quick suggestions:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
                    {[
                      {
                        title: 'Summarize Document',
                        desc: 'Full breakdown of key skills, projects & achievements',
                        prompt: 'Summarize this document and highlight the key skills and projects.',
                      },
                      {
                        title: 'Interview Pitch',
                        desc: 'Prepare a professional talking pitch for interviews',
                        prompt: 'I want to prepare my top project for an interview. How should I introduce and speak about it?',
                      },
                      {
                        title: 'Extract Core Skills',
                        desc: 'List languages, frameworks, databases, and tools',
                        prompt: 'What are all the technical skills, programming languages, and tools mentioned in my document?',
                      },
                      {
                        title: 'Verify Candidate Details',
                        desc: 'Extract contact info, university, and credentials',
                        prompt: 'What is my name, contact email, phone number, and educational background from my CV?',
                      },
                    ].map((item, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSuggestion(item.prompt)}
                        className="p-3.5 rounded-2xl bg-surface-100/70 hover:bg-surface-100 border border-white/[0.08] hover:border-brand-500/40 text-left transition-all duration-200 hover:-translate-y-0.5 shadow-md shadow-black/20 group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm text-slate-200 group-hover:text-brand-300 transition-colors">
                            {item.title}
                          </span>
                          <Brain className="w-3.5 h-3.5 text-slate-500 group-hover:text-brand-400 transition-colors" />
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Chat Messages List */
              <div className="max-w-4xl mx-auto space-y-4">
                {messages.map((message) => (
                  <ChatMessageItem
                    key={message.id}
                    message={message}
                    onSelectCitation={setActiveCitation}
                  />
                ))}

                {/* Thinking / Loading State Indicator */}
                {chatMutation.isPending && (
                  <div className="flex gap-3.5 p-4 rounded-xl bg-surface-100 border border-surface-300 mr-8 animate-pulse">
                    <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center text-white">
                      <Brain className="w-4 h-4" />
                    </div>
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 text-xs font-semibold text-brand-300">
                        <div className="w-2 h-2 rounded-full bg-brand-400 animate-ping" />
                        <span>Retrieving evidence and formulating answer...</span>
                      </div>
                      <div className="h-3 bg-surface-300/40 rounded w-3/4" />
                      <div className="h-3 bg-surface-300/40 rounded w-1/2" />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Bottom Input Area */}
          <div className="p-4 border-t border-surface-300 bg-surface-50/90 backdrop-blur-sm flex-shrink-0">
            <div className="max-w-4xl mx-auto">
              <ChatInput
                onSend={handleSend}
                isLoading={chatMutation.isPending}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Source Snippet Viewer Modal */}
      <SourceSnippetModal
        citation={activeCitation}
        onClose={() => setActiveCitation(null)}
      />
    </div>
  )
}
