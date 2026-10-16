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
      <div className="ml-0 md:ml-64 p-4 sm:p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="heading-lg text-white">Dashboard</h1>
              <p className="text-muted text-sm mt-1">Your document intelligence workspace</p>
            </div>
            <button
              onClick={() => setIsUploadOpen(!isUploadOpen)}
              className="btn-primary flex items-center gap-2"
              id="upload-button"
            >
              <Upload className="w-4 h-4" />
              Upload document
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 gap-4 max-w-sm">
            <Link to="/documents" className="card p-5 hover:border-brand-500/40 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted">Documents</span>
                <FileText className="w-4 h-4 text-brand-400" />
              </div>
              <div className="text-2xl font-bold text-white">{documentCount}</div>
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
              <h2 className="heading-md text-white text-lg font-semibold">Your Documents</h2>
              {hasDocuments && (
                <Link to="/documents" className="text-brand-400 hover:text-brand-300 text-sm font-medium">
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
