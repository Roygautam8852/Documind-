import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SummaryModal } from './components/SummaryModal'
import { DocumentComparisonModal } from './components/DocumentComparisonModal'
import { apiClient } from '@/lib/api-client'
import type { DocumentResponse } from '@/features/documents/types'

const mockDoc: DocumentResponse = {
  id: 'doc-123',
  owner_id: 'user-1',
  original_filename: 'Quarterly_Report.pdf',
  mime_type: 'application/pdf',
  size_bytes: 2048,
  checksum_sha256: 'fake_sha256',
  status: 'ready',
  error_code: null,
  safe_error_message: null,
  page_count: 5,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

const mockDoc2: DocumentResponse = {
  id: 'doc-456',
  owner_id: 'user-1',
  original_filename: 'Annual_Plan.pdf',
  mime_type: 'application/pdf',
  size_bytes: 4096,
  checksum_sha256: 'fake_sha256_2',
  status: 'ready',
  error_code: null,
  safe_error_message: null,
  page_count: 8,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  )
}

describe('SummaryModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders modal with document title and format buttons', () => {
    renderWithProviders(
      <SummaryModal document={mockDoc} isOpen={true} onClose={vi.fn()} />
    )

    expect(screen.getByText('Document Summary')).toBeInTheDocument()
    expect(screen.getByText('Quarterly_Report.pdf')).toBeInTheDocument()
    expect(screen.getByText('Executive')).toBeInTheDocument()
    expect(screen.getByText('Detailed')).toBeInTheDocument()
    expect(screen.getByText('Key Takeaways')).toBeInTheDocument()
    expect(screen.getByText('Generate Summary')).toBeInTheDocument()
  })

  it('generates executive summary and renders citation pills', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      document_id: 'doc-123',
      filename: 'Quarterly_Report.pdf',
      summary_type: 'executive',
      summary: 'Executive overview states strong quarterly margin growth [S1].',
      citations: [
        {
          citation_id: 'S1',
          document_id: 'doc-123',
          filename: 'Quarterly_Report.pdf',
          page_number: 2,
          chunk_id: 'chunk-1',
          snippet: 'Revenue climbed 15% with gross margins at 42%.',
        },
      ],
      total_chunks_processed: 4,
    })

    renderWithProviders(
      <SummaryModal document={mockDoc} isOpen={true} onClose={vi.fn()} />
    )

    const generateBtn = screen.getByText('Generate Summary')
    fireEvent.click(generateBtn)

    await waitFor(() => {
      expect(
        screen.getByText(/Executive overview states strong quarterly margin growth/)
      ).toBeInTheDocument()
    })

    // Both inline citation tag and citation card render [S1]
    const s1Elements = screen.getAllByText('[S1]')
    expect(s1Elements.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('4 chunks analyzed')).toBeInTheDocument()
    expect(screen.getByText(/Referenced Sources/)).toBeInTheDocument()

    // Click inline citation button to open snippet modal
    fireEvent.click(s1Elements[0])
    expect(screen.getByText('Revenue climbed 15% with gross margins at 42%.')).toBeInTheDocument()
  })
})

describe('DocumentComparisonModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders modal with selected documents catalog', () => {
    renderWithProviders(
      <DocumentComparisonModal
        documents={[mockDoc, mockDoc2]}
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('Multi-Document Comparison')).toBeInTheDocument()
    expect(screen.getByText('Quarterly_Report.pdf')).toBeInTheDocument()
    expect(screen.getByText('Annual_Plan.pdf')).toBeInTheDocument()
    expect(screen.getByText('Compare Documents')).toBeInTheDocument()
  })

  it('generates cross-document comparison and displays results', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      document_ids: ['doc-123', 'doc-456'],
      focus: 'financial targets',
      comparison: 'Both documents align on 15% expansion targets [S1] and operational standards [S2].',
      documents_compared: [
        { document_id: 'doc-123', filename: 'Quarterly_Report.pdf' },
        { document_id: 'doc-456', filename: 'Annual_Plan.pdf' },
      ],
      citations: [
        {
          citation_id: 'S1',
          document_id: 'doc-123',
          filename: 'Quarterly_Report.pdf',
          page_number: 1,
          chunk_id: 'chunk-1',
          snippet: 'Expansion target set to 15%.',
        },
        {
          citation_id: 'S2',
          document_id: 'doc-456',
          filename: 'Annual_Plan.pdf',
          page_number: 3,
          chunk_id: 'chunk-2',
          snippet: 'Operational standards conform to ISO standards.',
        },
      ],
    })

    renderWithProviders(
      <DocumentComparisonModal
        documents={[mockDoc, mockDoc2]}
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    const compareBtn = screen.getByText('Compare Documents')
    fireEvent.click(compareBtn)

    await waitFor(() => {
      expect(
        screen.getByText(/Both documents align on 15% expansion targets/)
      ).toBeInTheDocument()
    })

    expect(screen.getAllByText('[S1]').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('[S2]').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Cross-Document Citations/)).toBeInTheDocument()
  })
})
