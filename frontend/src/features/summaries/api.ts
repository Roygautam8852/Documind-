import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type {
  DocumentSummaryRequest,
  DocumentSummaryResponse,
  MultiDocComparisonRequest,
  MultiDocComparisonResponse,
} from './types'

export function useSummarizeDocument(documentId: string) {
  return useMutation<DocumentSummaryResponse, Error, DocumentSummaryRequest>({
    mutationFn: async (payload) => {
      return apiClient.post<DocumentSummaryResponse>(
        `/summaries/documents/${documentId}`,
        payload
      )
    },
  })
}

export function useCompareDocuments() {
  return useMutation<MultiDocComparisonResponse, Error, MultiDocComparisonRequest>({
    mutationFn: async (payload) => {
      return apiClient.post<MultiDocComparisonResponse>('/summaries/compare', payload)
    },
  })
}
