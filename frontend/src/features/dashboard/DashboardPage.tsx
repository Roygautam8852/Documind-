import { useState } from 'react'
import {
  Brain,
  FileText,
  MessageSquare,
  Upload,
  ArrowUpRight,
  Layers,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useDocuments } from '@/features/documents/api'
import { UploadDropzone } from '@/features/documents/components/UploadDropzone'
import { DocumentList } from '@/features/documents/components/DocumentList'
import { EchoSidebar } from '@/app/EchoSidebar'
import { MobileNav } from '@/app/MobileNav'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { formatUserDisplayName } from '@/lib/formatters'

export function DashboardPage() {
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const navigate = useNavigate()
  const { data, isLoading, isError } = useDocuments(1, 5)

  const { data: userProfile } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => apiClient.get<{ id: string; email: string }>('/auth/me'),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const documentCount = isLoading ? '...' : isError ? '0' : String(data?.total ?? 0)
  const displayName = formatUserDisplayName(userProfile?.email)

  return (
    <div className="flex h-screen bg-[#111215] overflow-hidden selection:bg-[#c8ff54] selection:text-black">
      {/* ── Desktop Echo Sidebar ───────────────────────────────────── */}
      <div className="hidden md:flex flex-shrink-0 h-full">
        <EchoSidebar onNewChat={() => navigate('/chat')} />
      </div>

      {/* ── Main Workspace ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#111215]">
        <MobileNav />

        {/* Top Header Bar */}
        <header className="h-16 bg-[#17181c] border-b border-[#262830] px-6 sm:px-8 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#22242c] hover:bg-[#2b2e38] text-gray-300 hover:text-white font-semibold text-xs transition-all border border-[#30333e] shadow-sm active:scale-95"
              title="Back to Landing Page"
              aria-label="Back to Landing Page"
            >
              <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Landing Page</span>
            </Link>
            <span className="text-gray-700">|</span>
            <div className="flex items-center gap-1.5 font-bold text-white text-sm cursor-pointer hover:text-slate-200">
              <span>DocuMind 1.0</span>
              <span className="text-xs text-gray-500">⌵</span>
            </div>
            <span className="text-gray-700">|</span>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#c8ff54]/15 border border-[#c8ff54]/30 text-xs font-semibold text-[#c8ff54]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c8ff54] animate-pulse" />
              Gemini 3.7 Flash Active
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsUploadOpen(!isUploadOpen)}
              className="bg-[#c8ff54] hover:bg-[#d8ff66] text-black font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm shadow-[#c8ff54]/20 flex items-center gap-1.5 active:scale-95"
            >
              <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{isUploadOpen ? 'Close Upload' : 'Upload Document'}</span>
            </button>
            <Link
              to="/chat"
              className="bg-[#22242c] hover:bg-[#2b2e38] text-white border border-[#30333e] font-medium text-xs px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>New Query</span>
            </Link>
          </div>
        </header>

        {/* Scrollable Canvas */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#111215]">
          <div className="max-w-5xl mx-auto space-y-8">
            {/* ── Hero Greeting Card ─────────────────────────────────── */}
            <div className="bg-[#17181c] rounded-[28px] p-6 sm:p-8 border border-[#272932] shadow-sm relative overflow-hidden">
              <div className="relative z-10 space-y-2">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                  Hello, {displayName}
                </h1>
                <p className="text-xl sm:text-2xl font-medium text-slate-300">
                  Let's make your research easier.
                </p>
                <p className="text-xs text-slate-400">
                  Your personal AI assistant for documents, research, and verified knowledge.
                </p>
              </div>

              {/* Decorative subtle accent */}
              <div className="absolute right-6 top-6 hidden sm:flex w-24 h-24 rounded-full bg-[#c8ff54]/10 items-center justify-center pointer-events-none">
                <Brain className="w-12 h-12 text-[#c8ff54]" />
              </div>
            </div>

            {/* ── 3 Echo Prompt & Feature Cards ──────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                onClick={() => navigate('/chat')}
                className="card-prompt group"
              >
                <div>
                  <div className="icon-container-lime">
                    <FileText className="w-5 h-5 text-black" />
                  </div>
                  <h3 className="font-bold text-white text-sm mb-1 group-hover:text-[#c8ff54] transition-colors">
                    Legal & Contract Insights
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Ask questions across agreements, CVs, and technical specifications with exact citations.
                  </p>
                </div>
                <div className="pt-4 flex items-center text-xs font-semibold text-slate-300 group-hover:text-white gap-1">
                  <span>Start query</span>
                  <ArrowUpRight className="w-3.5 h-3.5 stroke-[2]" />
                </div>
              </div>

              <div
                onClick={() => navigate('/documents')}
                className="card-prompt group"
              >
                <div>
                  <div className="icon-container-lime">
                    <Layers className="w-5 h-5 text-black" />
                  </div>
                  <h3 className="font-bold text-white text-sm mb-1 group-hover:text-[#c8ff54] transition-colors">
                    Document Library ({documentCount})
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Manage indexed files, monitor background chunking, and view vector embeddings.
                  </p>
                </div>
                <div className="pt-4 flex items-center text-xs font-semibold text-slate-300 group-hover:text-white gap-1">
                  <span>Manage files</span>
                  <ArrowUpRight className="w-3.5 h-3.5 stroke-[2]" />
                </div>
              </div>

              <div
                onClick={() => navigate('/chat')}
                className="card-prompt group"
              >
                <div>
                  <div className="icon-container-lime">
                    <ShieldCheck className="w-5 h-5 text-black" />
                  </div>
                  <h3 className="font-bold text-white text-sm mb-1 group-hover:text-[#c8ff54] transition-colors">
                    Verified Citations & Sources
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Evidence over hallucinations. Inspect exact text passages and similarity ranking.
                  </p>
                </div>
                <div className="pt-4 flex items-center text-xs font-semibold text-slate-300 group-hover:text-white gap-1">
                  <span>Explore research</span>
                  <ArrowUpRight className="w-3.5 h-3.5 stroke-[2]" />
                </div>
              </div>
            </div>

            {/* ── Upload Area (Toggleable) ───────────────────────────── */}
            {isUploadOpen && (
              <div className="bg-[#17181c] rounded-[24px] p-6 border border-[#272932] shadow-sm animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#c8ff54] text-black flex items-center justify-center font-bold">
                      <Upload className="w-4 h-4 text-black" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-white">Upload Knowledge Documents</h2>
                      <p className="text-xs text-slate-400">PDF, DOCX, TXT up to 50MB</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsUploadOpen(false)}
                    className="text-xs font-semibold text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-[#22242c]"
                  >
                    Cancel
                  </button>
                </div>
                <UploadDropzone onUploadSuccess={() => setIsUploadOpen(false)} />
              </div>
            )}

            {/* ── Document List Preview ──────────────────────────────── */}
            <div className="bg-[#17181c] rounded-[28px] p-6 sm:p-8 border border-[#272932] shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Recent Documents</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Your indexed knowledge base files</p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to="/documents"
                    className="text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-[#22242c] transition-colors"
                  >
                    <span>View all documents</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              <DocumentList />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
