import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Brain, BookOpen, FileText, MessageSquare, Upload } from 'lucide-react'
import { UploadDropzone } from './components/UploadDropzone'
import { DocumentList } from './components/DocumentList'
import { useDocuments } from './api'
import { AccountControl } from '@/features/auth/AccountControl'
import { MobileNav } from '@/app/MobileNav'

export function DocumentsPage() {
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const { data } = useDocuments(1, 100)

  const items = data?.items || []
  const total = data?.total || 0
  const readyCount = items.filter((d) => d.status === 'ready').length
  const processingCount = items.filter(
    (d) => d.status === 'processing' || d.status === 'uploaded'
  ).length
  const failedCount = items.filter((d) => d.status === 'failed').length

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
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-surface-200 text-sm font-medium transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            Dashboard
          </Link>
          <Link
            to="/documents"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-brand-500/10 text-brand-300 text-sm font-medium"
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
      <div className="ml-0 md:ml-64 p-4 sm:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="heading-lg text-white">Document Library</h1>
              <p className="text-muted text-sm mt-1">
                Upload and manage your documents for AI question answering and knowledge extraction
              </p>
            </div>
            <button
              onClick={() => setIsUploadOpen(!isUploadOpen)}
              className="btn-primary flex items-center gap-2 self-start sm:self-auto"
              id="toggle-upload-btn"
            >
              {isUploadOpen ? (
                <>Close Upload</>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload document
                </>
              )}
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card p-4">
              <span className="text-xs text-muted block mb-1">Total Documents</span>
              <span className="text-2xl font-bold text-white">{total}</span>
            </div>
            <div className="card p-4">
              <span className="text-xs text-muted block mb-1">Ready for Chat</span>
              <span className="text-2xl font-bold text-emerald-400">{readyCount}</span>
            </div>
            <div className="card p-4">
              <span className="text-xs text-muted block mb-1">Processing</span>
              <span className="text-2xl font-bold text-blue-400">{processingCount}</span>
            </div>
            <div className="card p-4">
              <span className="text-xs text-muted block mb-1">Failed</span>
              <span className="text-2xl font-bold text-rose-400">{failedCount}</span>
            </div>
          </div>

          {/* Upload Dropzone (Collapsible) */}
          {isUploadOpen && (
            <div className="animate-fade-in">
              <UploadDropzone
                onClose={() => setIsUploadOpen(false)}
                onUploadSuccess={() => {
                  // Keep dropzone open or close after short delay
                }}
              />
            </div>
          )}

          {/* Documents Table / Grid */}
          <DocumentList onOpenUpload={() => setIsUploadOpen(true)} />
        </div>
      </div>
    </div>
  )
}
