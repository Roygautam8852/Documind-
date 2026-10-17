import { useState, useRef, DragEvent, ChangeEvent } from 'react'
import { UploadCloud, File, AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react'
import { useUploadDocument } from '../api'
import type { DocumentUploadResponse } from '../types'

interface UploadDropzoneProps {
  onUploadSuccess?: (doc: DocumentUploadResponse) => void
  onClose?: () => void
}

import { formatBytes } from '@/lib/formatters'

const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'txt']
const MAX_SIZE_BYTES = 50 * 1024 * 1024 // 50MB

export function UploadDropzone({ onUploadSuccess, onClose }: UploadDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadMutation = useUploadDocument()

  const validateFile = (file: File): boolean => {
    setValidationError(null)
    setUploadSuccessMessage(null)

    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setValidationError(`Unsupported file type '.${ext}'. Only PDF, DOCX, and TXT files are allowed.`)
      return false
    }

    if (file.size === 0) {
      setValidationError('The selected file is empty.')
      return false
    }

    if (file.size > MAX_SIZE_BYTES) {
      setValidationError(`File exceeds 50 MB limit (${formatBytes(file.size)}).`)
      return false
    }

    return true
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const file = files[0]
      if (validateFile(file)) {
        setSelectedFile(file)
      }
    }
  }

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const file = files[0]
      if (validateFile(file)) {
        setSelectedFile(file)
      }
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setValidationError(null)
    try {
      const res = await uploadMutation.mutateAsync(selectedFile)
      setUploadSuccessMessage(`Successfully uploaded "${res.original_filename}". Processing started!`)
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      onUploadSuccess?.(res)
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Failed to upload document. Please try again.'
      setValidationError(msg)
    }
  }

  const handleCancelSelection = () => {
    setSelectedFile(null)
    setValidationError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="card p-6 border border-surface-300 relative">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-lg"
          aria-label="Close upload panel"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      <div className="mb-4">
        <h3 className="heading-md text-white text-lg font-semibold">Upload Document</h3>
        <p className="text-sm text-muted mt-1">
          Upload PDF, Word (DOCX), or plain text (TXT) files up to 50 MB.
        </p>
      </div>

      {/* Hidden native input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        onChange={handleFileInputChange}
        className="hidden"
        data-testid="file-input"
        id="file-upload-input"
      />

      {/* Drag & Drop Target Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        data-testid="dropzone-area"
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
          isDragOver
            ? 'border-[#b6f526] bg-[#b6f526]/10 scale-[1.01]'
            : 'border-gray-200 hover:border-[#b6f526] bg-gray-50 hover:bg-white'
        }`}
      >
        <div className="w-12 h-12 rounded-2xl bg-[#b6f526] text-black flex items-center justify-center mx-auto mb-3 shadow-sm font-bold">
          <UploadCloud className="w-6 h-6 text-black stroke-[2.2]" />
        </div>
        <p className="text-sm font-bold text-gray-900 mb-1">
          {isDragOver ? 'Drop file here' : 'Click to select or drag and drop'}
        </p>
        <p className="text-xs text-gray-500">PDF, DOCX, or TXT up to 50 MB</p>
      </div>

      {/* Selected File Details */}
      {selectedFile && (
        <div className="mt-4 p-3 bg-white rounded-xl flex items-center justify-between border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-[#b6f526]/30 text-black flex items-center justify-center shrink-0">
              <File className="w-4 h-4 text-black" />
            </div>
            <div className="truncate">
              <p className="text-sm font-bold text-gray-900 truncate">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">{formatBytes(selectedFile.size)}</p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleCancelSelection()
            }}
            disabled={uploadMutation.isPending}
            className="text-slate-400 hover:text-slate-200 p-1 transition-colors"
            aria-label="Remove selected file"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Validation Error Message */}
      {validationError && (
        <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 text-rose-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Success Message */}
      {uploadSuccessMessage && (
        <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2.5 text-emerald-400 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{uploadSuccessMessage}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-5 flex items-center justify-end gap-3">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost text-sm"
            disabled={uploadMutation.isPending}
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleUpload}
          disabled={!selectedFile || uploadMutation.isPending}
          className="btn-primary text-sm flex items-center gap-2"
          id="confirm-upload-button"
        >
          {uploadMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading...
            </>
          ) : (
            'Start Ingestion'
          )}
        </button>
      </div>
    </div>
  )
}
