import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LandingPage } from '@/features/landing/LandingPage'

function renderLanding() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('LandingPage', () => {
  it('renders the product name', () => {
    renderLanding()
    expect(screen.getAllByText(/DocuMind/i).length).toBeGreaterThan(0)
  })

  it('renders Get started CTA', () => {
    renderLanding()
    expect(screen.getByText(/Get started free/i)).toBeInTheDocument()
  })

  it('renders Sign in link', () => {
    renderLanding()
    expect(screen.getByRole('link', { name: /^sign in$/i })).toBeInTheDocument()
  })

  it('renders the how-it-works section', () => {
    renderLanding()
    expect(screen.getByText(/How DocuMind works/i)).toBeInTheDocument()
  })

  it('renders accuracy and quality section', () => {
    renderLanding()
    expect(screen.getByText(/Built for accuracy/i)).toBeInTheDocument()
  })
})
