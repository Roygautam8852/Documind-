import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { ConversationDetail, ConversationSummary, PaginatedConversations } from './types'

export function useConversations(page = 1, pageSize = 30) {
  return useQuery<PaginatedConversations>({
    queryKey: ['conversations', page, pageSize],
    queryFn: () =>
      apiClient.get<PaginatedConversations>(`/conversations?page=${page}&page_size=${pageSize}`),
  })
}

export function useConversation(conversationId: string | null) {
  return useQuery<ConversationDetail>({
    queryKey: ['conversation', conversationId],
    queryFn: () => apiClient.get<ConversationDetail>(`/conversations/${conversationId}`),
    enabled: Boolean(conversationId),
  })
}

export function useDeleteConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (conversationId: string) =>
      apiClient.delete<void>(`/conversations/${conversationId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}

export function useUpdateConversationTitle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ conversationId, title }: { conversationId: string; title: string }) =>
      apiClient.patch<ConversationSummary>(`/conversations/${conversationId}`, { title }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['conversation', variables.conversationId] })
    },
  })
}
