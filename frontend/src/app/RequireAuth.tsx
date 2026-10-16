import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { getAccessToken } from '@/lib/api-client'

export function RequireAuth({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const isAuthenticated = Boolean(getAccessToken())

  useEffect(() => {
    const onUnauthorized = () => navigate('/login', { replace: true, state: { from: location } })
    window.addEventListener('documind:unauthorized', onUnauthorized)
    return () => window.removeEventListener('documind:unauthorized', onUnauthorized)
  }, [location, navigate])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return children
}
