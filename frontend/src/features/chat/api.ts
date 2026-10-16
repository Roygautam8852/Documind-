import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { ChatQueryRequest, ChatQueryResponse } from './types'

export function useChatQuery() {
  return useMutation<ChatQueryResponse, Error, ChatQueryRequest>({
    mutationFn: async (payload) => {
      return apiClient.post<ChatQueryResponse>('/chat/query', payload)
    },
  })
}
