import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ChatPage } from './ChatPage'
import { apiClient } from '@/lib/api-client'

function renderChatPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ChatPage />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('ChatPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()

    // Mock API client GET requests for documents and conversations
    vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url.startsWith('/conversations/conv-1')) {
        return {
          id: 'conv-1',
          title: 'Previous Architecture Chat',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          messages: [
            {
              id: 'm1',
              conversation_id: 'conv-1',
              role: 'user',
              content: 'What is DocuMind architecture?',
              citations: [],
              created_at: new Date().toISOString(),
            },
            {
              id: 'm2',
              conversation_id: 'conv-1',
              role: 'assistant',
              content: 'DocuMind uses vector embeddings and RAG pipelines.',
              citations: [],
              created_at: new Date().toISOString(),
            },
          ],
        }
      }

      if (url.startsWith('/conversations')) {
        return {
          total: 1,
          items: [
            {
              id: 'conv-1',
              title: 'Previous Architecture Chat',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              message_count: 2,
            },
          ],
        }
      }

      return {
        total: 1,
        items: [
          {
            id: 'doc-1',
            original_filename: 'architecture.pdf',
            status: 'ready',
            page_count: 5,
          },
        ],
      }
    })
  })

  it('renders chat header, conversation sidebar, and empty state suggestions', async () => {
    renderChatPage()
    expect(screen.getByText('Chat Intelligence')).toBeInTheDocument()
    expect(screen.getByText('New Chat')).toBeInTheDocument()
    expect(screen.getByText('Chat History')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Previous Architecture Chat')).toBeInTheDocument()
    })

    expect(screen.getByText(/Ask questions about your uploaded documents/i)).toBeInTheDocument()
    expect(screen.getByText('What are the key points in this document?')).toBeInTheDocument()
  })

  it('submits a question and renders assistant response with citations', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({
      answer: 'DocuMind isolates tenants with cryptographic tokens [S1].',
      citations: [
        {
          citation_id: 'S1',
          document_id: 'doc-1',
          filename: 'architecture.pdf',
          page_number: 2,
          chunk_id: 'chk-1',
          snippet: 'Tenant isolation is cryptographically guaranteed on page 2.',
        },
      ],
      retrieval: { result_count: 1 },
      conversation_id: 'conv-new-1',
      request_id: 'req-test-1',
    })

    renderChatPage()

    const textarea = screen.getByPlaceholderText(/Ask a question about your documents/i)
    fireEvent.change(textarea, { target: { value: 'How is tenant isolation handled?' } })

    const sendBtn = screen.getByLabelText('Send message')
    fireEvent.click(sendBtn)

    // User message should appear
    expect(screen.getByText('How is tenant isolation handled?')).toBeInTheDocument()

    // Assistant response should appear
    await waitFor(() => {
      expect(
        screen.getByText(/DocuMind isolates tenants with cryptographic tokens/i)
      ).toBeInTheDocument()
    })

    // Citations should be rendered
    expect(screen.getByText(/Sources Referenced \(1\)/i)).toBeInTheDocument()
    expect(screen.getAllByText('architecture.pdf').length).toBeGreaterThanOrEqual(1)
  })

  it('opens source snippet modal when citation badge is clicked', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({
      answer: 'Analysis results [S1].',
      citations: [
        {
          citation_id: 'S1',
          document_id: 'doc-1',
          filename: 'architecture.pdf',
          page_number: 4,
          chunk_id: 'chk-10',
          snippet: 'Excerpt describing system performance on page 4.',
        },
      ],
      retrieval: { result_count: 1 },
      conversation_id: 'conv-new-2',
      request_id: 'req-test-2',
    })

    renderChatPage()

    const textarea = screen.getByPlaceholderText(/Ask a question about your documents/i)
    fireEvent.change(textarea, { target: { value: 'Performance summary' } })
    fireEvent.click(screen.getByLabelText('Send message'))

    await waitFor(() => {
      expect(screen.getByText(/Analysis results/i)).toBeInTheDocument()
    })

    // Click citation button
    const citationBadge = screen.getByTitle(/View source passage: architecture.pdf/i)
    fireEvent.click(citationBadge)

    // Modal should open
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Excerpt describing system performance on page 4.')).toBeInTheDocument()

    // Close modal
    const closeBtn = screen.getByLabelText('Close snippet modal')
    fireEvent.click(closeBtn)

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('loads message history when clicking a conversation and resets on New Chat', async () => {
    renderChatPage()

    await waitFor(() => {
      expect(screen.getByText('Previous Architecture Chat')).toBeInTheDocument()
    })

    // Click on conversation in sidebar
    fireEvent.click(screen.getByText('Previous Architecture Chat'))

    // Should load the historical messages
    await waitFor(() => {
      expect(screen.getByText('What is DocuMind architecture?')).toBeInTheDocument()
      expect(
        screen.getByText('DocuMind uses vector embeddings and RAG pipelines.')
      ).toBeInTheDocument()
    })

    // Click New Chat
    const newChatBtn = screen.getByLabelText('Start a new chat')
    fireEvent.click(newChatBtn)

    // Historical messages should be cleared and empty suggestions shown
    expect(screen.queryByText('What is DocuMind architecture?')).not.toBeInTheDocument()
    expect(screen.getByText(/Ask questions about your uploaded documents/i)).toBeInTheDocument()
  })

  it('renders error message when chat query API rejects', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('AI provider connection timeout'))

    renderChatPage()

    const textarea = screen.getByPlaceholderText(/Ask a question about your documents/i)
    fireEvent.change(textarea, { target: { value: 'Test failing question' } })
    fireEvent.click(screen.getByLabelText('Send message'))

    await waitFor(() => {
      expect(screen.getByText(/Unable to complete query/i)).toBeInTheDocument()
      expect(screen.getByText(/AI provider connection timeout/i)).toBeInTheDocument()
    })
  })
})
