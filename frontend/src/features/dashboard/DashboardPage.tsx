import { useState } from 'react'
import { Brain, FileText, MessageSquare, Upload, BookOpen } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useDocuments } from '@/features/documents/api'
import { UploadDropzone } from '@/features/documents/components/UploadDropzone'
import { DocumentList } from '@/features/documents/components/DocumentList'
import { AccountControl } from '@/features/auth/AccountControl'
import { MobileNav } from '@/app/MobileNav'

export function DashboardPage() {
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const navigate = useNavigate()
  const { data, isLoading, isError } = useDocuments(1, 5)

  const documentCount = isLoading ? '...' : isError ? '—' : String(data?.total ?? 0)
  const hasDocuments = (data?.total ?? 0) > 0

  return (
    <div className="min-h-screen bg-surface-50 text-slate-200">
      <MobileNav />
      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <div className="hidden md:flex fixed inset-y-0 left-0 w-64 bg-surface-100 border-r border-surface-300 flex-col z-20">
        <div className="flex items-center gap-2 px-4 h-16 border-b border-surface-300">
          <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white">DocuMind</span>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <Link
            to="/dashboard"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-brand-500/10 text-brand-300 text-sm font-medium"
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
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-surface-200 text-sm font-medium transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            Chat
          </Link>
        </nav>

        <div className="p-3 border-t border-surface-300">
          <AccountControl />
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="ml-0 md:ml-64 p-4 sm:p-8 bg-ambient min-h-screen">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Header Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-900/40 via-surface-100/80 to-surface-100/90 border border-white/[0.08] p-6 sm:p-8 backdrop-blur-xl shadow-xl shadow-black/20">
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Gemini 3.8 Flash AI Engine Active
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Welcome to <span className="gradient-text">DocuMind</span>
                </h1>
                <p className="text-slate-300 text-sm max-w-lg leading-relaxed">
                  Your document intelligence workspace. Upload documents, run semantic retrieval, and get answers with verifiable citations.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsUploadOpen(!isUploadOpen)}
                  className="btn-primary flex items-center gap-2 shadow-lg shadow-brand-500/25 px-5 py-2.5 rounded-xl font-medium"
                  id="upload-button"
                >
                  <Upload className="w-4 h-4" />
                  Upload document
                </button>
                <Link
                  to="/chat"
                  className="btn-secondary flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-200/80 hover:bg-surface-200 border border-white/[0.08] text-white"
                >
                  <MessageSquare className="w-4 h-4 text-brand-300" />
                  Open Chat
                </Link>
              </div>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link to="/documents" className="card-premium p-5 group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Documents</span>
                <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-400 group-hover:scale-110 transition-transform">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-white">{documentCount}</div>
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                <span>View library</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </p>
            </Link>

            <Link to="/chat" className="card-premium p-5 group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">RAG Pipeline</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <Brain className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-emerald-400">Ready</div>
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                <span>Hybrid Search + Citations</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </p>
            </Link>

            <Link to="/documents" className="card-premium p-5 group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Vector Store</span>
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400 group-hover:scale-110 transition-transform">
                  <BookOpen className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-white">ChromaDB</div>
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                <span>Persistent embeddings indexed</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </p>
            </Link>
          </div>

          {/* Upload Dropzone (Collapsible) */}
          {isUploadOpen && (
            <div className="animate-fade-in">
              <UploadDropzone
                onClose={() => setIsUploadOpen(false)}
                onUploadSuccess={() => {
                  navigate('/documents')
                }}
              />
            </div>
          )}

          {/* Documents Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="heading-md text-white text-lg font-bold">Document Library</h2>
                <p className="text-xs text-slate-400 mt-0.5">Manage and query your uploaded files</p>
              </div>
              {hasDocuments && (
                <Link to="/documents" className="text-brand-400 hover:text-brand-300 text-sm font-medium transition-colors">
                  View all documents →
                </Link>
              )}
            </div>

            <DocumentList onOpenUpload={() => setIsUploadOpen(true)} />
          </div>
        </div>
      </div>
    </div>
  )
}
