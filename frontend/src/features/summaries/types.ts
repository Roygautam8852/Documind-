import { Citation } from '@/features/chat/types'

export type SummaryType = 'executive' | 'detailed' | 'bullet_points'

export interface DocumentSummaryRequest {
  summary_type?: SummaryType
  focus?: string
  conversation_id?: string | null
}

export interface DocumentSummaryResponse {
  document_id: string
  filename: string
  summary_type: SummaryType
  summary: string
  citations: Citation[]
  total_chunks_processed: number
  conversation_id?: string | null
  request_id?: string
}

export interface MultiDocComparisonRequest {
  document_ids: string[]
  focus?: string
  conversation_id?: string | null
}

export interface ComparedDocumentItem {
  document_id: string
  filename: string
}

export interface MultiDocComparisonResponse {
  document_ids: string[]
  focus?: string | null
  comparison: string
  documents_compared: ComparedDocumentItem[]
  citations: Citation[]
  conversation_id?: string | null
  request_id?: string
}
