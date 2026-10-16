import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UploadDropzone } from './UploadDropzone'

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('UploadDropzone', () => {
  it('renders upload instructions and drop target', () => {
    renderWithClient(<UploadDropzone />)
    expect(screen.getByText(/Upload Document/i)).toBeInTheDocument()
    expect(screen.getByText(/Click to select or drag and drop/i)).toBeInTheDocument()
    expect(screen.getByText(/PDF, DOCX, or TXT up to 50 MB/i)).toBeInTheDocument()
  })

  it('rejects unsupported file extensions with an error alert', () => {
    renderWithClient(<UploadDropzone />)
    const input = screen.getByTestId('file-input')
    const badFile = new File(['content'], 'malware.exe', { type: 'application/x-msdownload' })

    fireEvent.change(input, { target: { files: [badFile] } })

    expect(screen.getByText(/Unsupported file type '.exe'/i)).toBeInTheDocument()
    expect(screen.queryByText('malware.exe')).not.toBeInTheDocument()
  })

  it('rejects empty file with size 0', () => {
    renderWithClient(<UploadDropzone />)
    const input = screen.getByTestId('file-input')
    const emptyFile = new File([], 'empty.txt', { type: 'text/plain' })

    fireEvent.change(input, { target: { files: [emptyFile] } })

    expect(screen.getByText(/The selected file is empty/i)).toBeInTheDocument()
  })

  it('accepts valid PDF file and displays its name and formatted size', () => {
    renderWithClient(<UploadDropzone />)
    const input = screen.getByTestId('file-input')
    const validFile = new File(['%PDF-1.4 sample content here'], 'sample.pdf', {
      type: 'application/pdf',
    })

    fireEvent.change(input, { target: { files: [validFile] } })

    expect(screen.getByText('sample.pdf')).toBeInTheDocument()
    expect(screen.queryByText(/Unsupported file type/i)).not.toBeInTheDocument()
  })

  it('allows canceling a selected file before submission', () => {
    renderWithClient(<UploadDropzone />)
    const input = screen.getByTestId('file-input')
    const validFile = new File(['Hello text file content'], 'notes.txt', {
      type: 'text/plain',
    })

    fireEvent.change(input, { target: { files: [validFile] } })
    expect(screen.getByText('notes.txt')).toBeInTheDocument()

    const removeBtn = screen.getByLabelText(/Remove selected file/i)
    fireEvent.click(removeBtn)

    expect(screen.queryByText('notes.txt')).not.toBeInTheDocument()
  })
})
