import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText,
  FileCode,
  File,
  RotateCw,
  Trash2,
  AlertTriangle,
  Clock,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Info,
  Sparkles,
  Layers,
  MessageSquare,
} from 'lucide-react'
import { useDocuments, useDeleteDocument, useRetryDocument } from '../api'
import { formatBytes } from '@/lib/formatters'
import type { DocumentResponse, DocumentStatus } from '../types'
import { SummaryModal } from '@/features/summaries/components/SummaryModal'
import { DocumentComparisonModal } from '@/features/summaries/components/DocumentComparisonModal'

interface DocumentListProps {
  onOpenUpload?: () => void
}

function getFileIcon(filename: string, mimeType: string) {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  if (ext === 'pdf' || mimeType.includes('pdf')) {
    return <FileText className="w-5 h-5 text-rose-400" />
  }
  if (ext === 'docx' || mimeType.includes('word') || mimeType.includes('officedocument')) {
    return <FileCode className="w-5 h-5 text-blue-400" />
  }
  return <File className="w-5 h-5 text-amber-400" />
}

function StatusBadge({ status, safeErrorMessage }: { status: DocumentStatus; safeErrorMessage?: string | null }) {
  switch (status) {
    case 'ready':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#c8ff54]/15 text-[#c8ff54] border border-[#c8ff54]/30">
          <span className="w-1.5 h-1.5 rounded-full bg-[#c8ff54]" />
          Ready
        </span>
      )
    case 'processing':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200 animate-pulse">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Processing
        </span>
      )
    case 'uploaded':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3.5 h-3.5" />
          Uploaded
        </span>
      )
    case 'failed':
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-600 border border-rose-200 cursor-help"
          title={safeErrorMessage || 'Ingestion failed'}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Failed
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
          {status}
        </span>
      )
  }
}

export function DocumentList({ onOpenUpload }: DocumentListProps) {
  const [page, setPage] = useState(1)
  const pageSize = 10
  const { data, isLoading, isError, error } = useDocuments(page, pageSize)
  const deleteMutation = useDeleteDocument()
  const retryMutation = useRetryDocument()

  const [documentToDelete, setDocumentToDelete] = useState<DocumentResponse | null>(null)
  const [activeErrorDetail, setActiveErrorDetail] = useState<string | null>(null)
  const [documentToSummarize, setDocumentToSummarize] = useState<DocumentResponse | null>(null)
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set())
  const [isComparisonOpen, setIsComparisonOpen] = useState(false)

  const handleDelete = async () => {
    if (!documentToDelete) return
    try {
      await deleteMutation.mutateAsync(documentToDelete.id)
      setDocumentToDelete(null)
    } catch {
      // Handled by react-query
    }
  }

  const handleRetry = async (doc: DocumentResponse) => {
    try {
      await retryMutation.mutateAsync(doc.id)
    } catch {
      // Handled by react-query
    }
  }

  if (isLoading) {
    return (
      <div className="card p-8 flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 text-brand-400 animate-spin mb-3" />
        <p className="text-sm text-muted">Loading your document library...</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="card p-6 border-rose-500/30 bg-rose-500/5 text-center">
        <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
        <h4 className="text-white font-medium mb-1">Failed to load documents</h4>
        <p className="text-xs text-rose-300">
          {(error as Error)?.message || 'Could not fetch your document list.'}
        </p>
      </div>
    )
  }

  const documents = data?.items || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / pageSize) || 1

  if (documents.length === 0) {
    return (
      <div className="card p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-brand-400" />
        </div>
        <h3 className="heading-md mb-2 text-white">No documents uploaded yet</h3>
        <p className="text-sm text-muted max-w-md mb-6">
          Upload PDF, Word (DOCX), or text (TXT) documents to parse their text, chunk their contents, and prepare them for AI intelligence.
        </p>
        {onOpenUpload && (
          <button onClick={onOpenUpload} className="btn-primary" id="empty-state-upload-button">
            Upload document
          </button>
        )}
      </div>
    )
  }

  const readyDocs = documents.filter((d) => d.status === 'ready')
  const allReadySelected =
    readyDocs.length > 0 && readyDocs.every((d) => selectedDocIds.has(d.id))

  const handleToggleSelectAll = () => {
    if (allReadySelected) {
      setSelectedDocIds(new Set())
    } else {
      setSelectedDocIds(new Set(readyDocs.map((d) => d.id)))
    }
  }

  const handleToggleSelect = (id: string) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectedDocsList = documents.filter((d) => selectedDocIds.has(d.id))

  return (
    <div className="space-y-4">
      {/* Comparison Action Bar */}
      {selectedDocIds.size >= 2 && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-brand-500/10 border border-brand-500/30 text-xs animate-fade-in">
          <div className="flex items-center gap-2 text-brand-300 font-medium">
            <Layers className="w-4 h-4 text-brand-400" />
            <span>{selectedDocIds.size} documents selected for comparative analysis</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedDocIds(new Set())}
              className="px-2.5 py-1 text-slate-400 hover:text-white transition-colors"
            >
              Clear selection
            </button>
            <button
              type="button"
              onClick={() => setIsComparisonOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium shadow-sm transition-colors"
            >
              <Layers className="w-3.5 h-3.5" />
              Compare Documents ({selectedDocIds.size})
            </button>
          </div>
        </div>
      )}

      {/* Document Table */}
      <div className="card overflow-hidden border border-gray-200 shadow-sm bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" data-testid="documents-table">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-3 w-8">
                  <input
                    type="checkbox"
                    checked={allReadySelected}
                    onChange={handleToggleSelectAll}
                    disabled={readyDocs.length === 0}
                    className="rounded bg-surface-200 border-surface-300 text-brand-500 focus:ring-brand-500 cursor-pointer"
                    title="Select all ready documents"
                    aria-label="Select all ready documents"
                  />
                </th>
                <th className="py-3 px-4">Document</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Pages</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Uploaded</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-300 text-sm">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-surface-100/50 transition-colors">
                  <td className="py-3 px-3 w-8">
                    {doc.status === 'ready' && (
                      <input
                        type="checkbox"
                        checked={selectedDocIds.has(doc.id)}
                        onChange={() => handleToggleSelect(doc.id)}
                        className="rounded bg-surface-200 border-surface-300 text-brand-500 focus:ring-brand-500 cursor-pointer"
                        aria-label={`Select ${doc.original_filename}`}
                      />
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-surface-200 flex items-center justify-center shrink-0">
                        {getFileIcon(doc.original_filename, doc.mime_type)}
                      </div>
                      <div className="truncate max-w-xs sm:max-w-md">
                        <p className="font-medium text-white truncate" title={doc.original_filename}>
                          {doc.original_filename}
                        </p>
                        <p className="text-xs text-muted truncate">{doc.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                    {formatBytes(doc.size_bytes)}
                  </td>
                  <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                    {doc.page_count !== null && doc.page_count !== undefined ? doc.page_count : '—'}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={doc.status} safeErrorMessage={doc.safe_error_message} />
                      {doc.safe_error_message && (
                        <button
                          type="button"
                          onClick={() => setActiveErrorDetail(doc.safe_error_message)}
                          className="text-slate-400 hover:text-slate-200 p-0.5"
                          title="View error detail"
                        >
                          <Info className="w-3.5 h-3.5 text-rose-400" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-muted whitespace-nowrap">
                    {new Date(doc.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {doc.status === 'failed' && (
                        <button
                          onClick={() => handleRetry(doc)}
                          disabled={retryMutation.isPending}
                          className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors"
                          title="Retry ingestion"
                          aria-label={`Retry ${doc.original_filename}`}
                        >
                          <RotateCw
                            className={`w-4 h-4 ${retryMutation.isPending ? 'animate-spin' : ''}`}
                          />
                        </button>
                      )}
                      {doc.status === 'ready' && (
                        <>
                          <Link
                            to={`/chat?docId=${doc.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#c8ff54] hover:bg-[#d8ff66] text-black font-bold text-xs rounded-lg transition-all shadow-sm shadow-[#c8ff54]/20 active:scale-95"
                            title="Chat with this document"
                            aria-label={`Chat with ${doc.original_filename}`}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Chat</span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => setDocumentToSummarize(doc)}
                            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#22242c] rounded-lg transition-colors"
                            title="Summarize document"
                            aria-label={`Summarize ${doc.original_filename}`}
                          >
                            <Sparkles className="w-4 h-4 text-gray-400 hover:text-white" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setDocumentToDelete(doc)}
                        className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Delete document"
                        aria-label={`Delete ${doc.original_filename}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-surface-300 bg-surface-100/30 text-sm">
            <span className="text-muted text-xs">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} documents
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="btn-ghost text-xs p-1.5 disabled:opacity-30"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-300 px-2">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="btn-ghost text-xs p-1.5 disabled:opacity-30"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {documentToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card max-w-md w-full p-6 border border-surface-300 animate-scale-in">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
            <h4 className="heading-md text-white text-lg mb-2">Delete document?</h4>
            <p className="text-sm text-muted mb-6">
              Are you sure you want to delete{' '}
              <strong className="text-slate-200">{documentToDelete.original_filename}</strong>? This will permanently remove the stored file and all extracted text and chunks.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDocumentToDelete(null)}
                className="btn-ghost text-sm"
                disabled={deleteMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="btn-primary bg-rose-600 hover:bg-rose-500 text-sm flex items-center gap-2"
                id="confirm-delete-button"
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete document'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Detail Modal */}
      {activeErrorDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card max-w-md w-full p-6 border border-surface-300">
            <h4 className="text-white font-medium mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              Ingestion Error Details
            </h4>
            <p className="text-sm text-slate-300 p-3 bg-surface-200 rounded-lg mb-4">
              {activeErrorDetail}
            </p>
            <div className="flex justify-end">
              <button onClick={() => setActiveErrorDetail(null)} className="btn-ghost text-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Modal */}
      <SummaryModal
        document={documentToSummarize}
        isOpen={!!documentToSummarize}
        onClose={() => setDocumentToSummarize(null)}
      />

      {/* Multi-Document Comparison Modal */}
      <DocumentComparisonModal
        documents={selectedDocsList}
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
      />
    </div>
  )
}
