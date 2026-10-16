export type DocumentStatus = 'uploaded' | 'processing' | 'ready' | 'failed' | 'deleting'

export interface DocumentResponse {
  id: string
  owner_id: string
  original_filename: string
  mime_type: string
  size_bytes: number
  checksum_sha256: string
  status: DocumentStatus
  error_code: string | null
  safe_error_message: string | null
  page_count: number | null
  created_at: string
  updated_at: string
}

export interface DocumentListResponse {
  items: DocumentResponse[]
  total: number
  page: number
  page_size: number
  has_more: boolean
}

export interface DocumentUploadResponse {
  id: string
  original_filename: string
  status: DocumentStatus
  size_bytes: number
  message: string
}
