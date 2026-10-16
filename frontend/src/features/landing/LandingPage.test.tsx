import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { LandingPage } from '@/features/landing/LandingPage'

describe('LandingPage', () => {
  it('renders the product name', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    )
    // Should have at least one instance of DocuMind
    expect(screen.getAllByText(/DocuMind/i).length).toBeGreaterThan(0)
  })

  it('renders Get started CTA', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    )
    expect(screen.getByText(/Get started free/i)).toBeInTheDocument()
  })

  it('renders Sign in link', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    )
    expect(screen.getByRole('link', { name: /^sign in$/i })).toBeInTheDocument()
  })

  it('renders the how-it-works section', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    )
    expect(screen.getByText(/How DocuMind works/i)).toBeInTheDocument()
  })

  it('renders privacy notice', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    )
    expect(screen.getByText(/Your documents, your data/i)).toBeInTheDocument()
  })
})
