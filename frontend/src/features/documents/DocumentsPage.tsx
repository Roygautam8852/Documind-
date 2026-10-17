import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FileText,
  MessageSquare,
  Upload,
  CheckCircle,
  Clock,
  ArrowLeft,
} from 'lucide-react'
import { UploadDropzone } from './components/UploadDropzone'
import { DocumentList } from './components/DocumentList'
import { useDocuments } from './api'
import { EchoSidebar } from '@/app/EchoSidebar'
import { MobileNav } from '@/app/MobileNav'

export function DocumentsPage() {
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const navigate = useNavigate()
  const { data } = useDocuments(1, 100)

  const items = data?.items || []
  const total = data?.total || 0
  const readyCount = items.filter((d) => d.status === 'ready').length
  const processingCount = items.filter(
    (d) => d.status === 'processing' || d.status === 'uploaded'
  ).length

  return (
    <div className="flex h-screen bg-[#F4F5F7] overflow-hidden selection:bg-[#b6f526] selection:text-black">
      {/* ── Desktop Echo Sidebar ───────────────────────────────────── */}
      <div className="hidden md:flex flex-shrink-0 h-full">
        <EchoSidebar onNewChat={() => navigate('/chat')} />
      </div>

      {/* ── Main Workspace ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <MobileNav />

        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-gray-200/80 px-6 sm:px-8 flex items-center justify-between flex-shrink-0">
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
              <span>DocuMind Library</span>
              <span className="text-xs text-gray-400">/ Documents</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/chat"
              className="bg-[#111215] hover:bg-[#1c1e24] text-white font-medium text-xs px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Ask AI</span>
            </Link>
            <button
              onClick={() => setIsUploadOpen(!isUploadOpen)}
              className="bg-[#b6f526] hover:bg-[#a5e61c] text-black font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm shadow-[#b6f526]/20 flex items-center gap-1.5 active:scale-95"
              id="toggle-upload-btn"
            >
              <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{isUploadOpen ? 'Close Upload' : 'Upload Document'}</span>
            </button>
          </div>
        </header>

        {/* Scrollable Canvas */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-5xl mx-auto space-y-8">
            {/* ── Page Header Card ────────────────────────────────────── */}
            <div className="bg-white rounded-[28px] p-6 sm:p-8 border border-gray-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#b6f526]/20 text-[#3b6009] border border-[#b6f526]/40 mb-1">
                  ChromaDB Vector Store Synced
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                  Document Knowledge Base
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 max-w-lg">
                  Upload PDF, DOCX, or text files. Chunks and embeddings are automatically indexed for citations.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsUploadOpen(true)}
                  className="bg-[#b6f526] hover:bg-[#a5e61c] text-black font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm shadow-[#b6f526]/20 flex items-center gap-2"
                >
                  <Upload className="w-4 h-4 stroke-[2.5]" />
                  <span>Upload Files</span>
                </button>
              </div>
            </div>

            {/* ── 3 Metric Cards (EchoAI prompt style) ────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="card p-5 bg-white flex items-center gap-4">
                <div className="icon-container-lime shrink-0">
                  <FileText className="w-5 h-5 text-black" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Documents</p>
                  <p className="text-2xl font-extrabold text-gray-900 mt-0.5">{total}</p>
                </div>
              </div>

              <div className="card p-5 bg-white flex items-center gap-4">
                <div className="icon-container-lime shrink-0">
                  <CheckCircle className="w-5 h-5 text-black" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ready for Chat</p>
                  <p className="text-2xl font-extrabold text-gray-900 mt-0.5">{readyCount}</p>
                </div>
              </div>

              <div className="card p-5 bg-white flex items-center gap-4">
                <div className="icon-container-lime shrink-0">
                  <Clock className="w-5 h-5 text-black" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Processing / Queue</p>
                  <p className="text-2xl font-extrabold text-gray-900 mt-0.5">{processingCount}</p>
                </div>
              </div>
            </div>

            {/* ── Upload Drawer ───────────────────────────────────────── */}
            {isUploadOpen && (
              <div className="bg-white rounded-[24px] p-6 border border-gray-200/90 shadow-sm animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#b6f526] text-black flex items-center justify-center font-bold">
                      <Upload className="w-4 h-4 text-black" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-gray-900">Upload New Document</h2>
                      <p className="text-xs text-gray-500">Files will be converted, chunked, and embedded into vectors.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsUploadOpen(false)}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-900 px-2 py-1 rounded-lg hover:bg-gray-100"
                  >
                    Close
                  </button>
                </div>
                <UploadDropzone onUploadSuccess={() => setIsUploadOpen(false)} />
              </div>
            )}

            {/* ── Document List Card ─────────────────────────────────── */}
            <div className="bg-white rounded-[28px] p-6 sm:p-8 border border-gray-200/80 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 tracking-tight">Indexed Documents</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Click any document to start grounded chat</p>
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
