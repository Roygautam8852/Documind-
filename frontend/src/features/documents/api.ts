import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type {
  DocumentListResponse,
  DocumentResponse,
  DocumentUploadResponse,
} from './types'

// ── API Functions ─────────────────────────────────────────────────────────────

export async function getDocuments(
  page = 1,
  pageSize = 20
): Promise<DocumentListResponse> {
  return apiClient.get<DocumentListResponse>('/documents', {
    params: { page, page_size: pageSize },
  })
}

export async function getDocument(id: string): Promise<DocumentResponse> {
  return apiClient.get<DocumentResponse>(`/documents/${id}`)
}

export async function uploadDocument(file: File): Promise<DocumentUploadResponse> {
  const formData = new FormData()
  formData.append('file', file)
  return apiClient.upload<DocumentUploadResponse>('/documents', formData)
}

export async function deleteDocument(id: string): Promise<void> {
  return apiClient.delete<void>(`/documents/${id}`)
}

export async function retryDocument(id: string): Promise<DocumentResponse> {
  return apiClient.post<DocumentResponse>(`/documents/${id}/retry`)
}

// ── Query & Mutation Hooks ────────────────────────────────────────────────────

export const DOCUMENTS_QUERY_KEY = 'documents'

export function useDocuments(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: [DOCUMENTS_QUERY_KEY, page, pageSize],
    queryFn: () => getDocuments(page, pageSize),
    refetchInterval: (query) => {
      const data = query.state.data
      if (!data) return false
      // Poll every 2.5s if any document is currently in uploaded or processing status
      const hasActiveIngestion = data.items.some(
        (doc) => doc.status === 'uploaded' || doc.status === 'processing'
      )
      return hasActiveIngestion ? 2500 : false
    },
  })
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: [DOCUMENTS_QUERY_KEY, id],
    queryFn: () => getDocument(id),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const doc = query.state.data
      if (!doc) return false
      return doc.status === 'uploaded' || doc.status === 'processing' ? 2500 : false
    },
  })
}

export function useUploadDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadDocument(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DOCUMENTS_QUERY_KEY] })
    },
  })
}

export function useDeleteDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DOCUMENTS_QUERY_KEY] })
    },
  })
}

export function useRetryDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => retryDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DOCUMENTS_QUERY_KEY] })
    },
  })
}
