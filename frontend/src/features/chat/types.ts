export interface Citation {
  citation_id: string
  document_id: string
  filename: string
  page_number: number | null
  chunk_id: string
  snippet: string
}

export interface RetrievalMeta {
  result_count: number
}

export interface ChatQueryRequest {
  question: string
  document_ids?: string[]
  conversation_id?: string | null
}

export interface ChatQueryResponse {
  answer: string
  citations: Citation[]
  retrieval: RetrievalMeta
  conversation_id?: string | null
  request_id: string
}

export interface ChatMessage {
  id: string
  sender: 'user' | 'assistant'
  text: string
  citations?: Citation[]
  retrievalCount?: number
  timestamp: string
  isError?: boolean
}

export interface ConversationSummary {
  id: string
  title: string | null
  created_at: string
  updated_at: string
  message_count: number
}

export interface ConversationMessageItem {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  citations: Citation[]
  retrieval_metadata?: { result_count?: number } | null
  created_at: string
}

export interface ConversationDetail {
  id: string
  title: string | null
  created_at: string
  updated_at: string
  messages: ConversationMessageItem[]
}

export interface PaginatedConversations {
  items: ConversationSummary[]
  total: number
  page: number
  page_size: number
  has_next: boolean
}

