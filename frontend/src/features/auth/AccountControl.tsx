import { useQuery, useQueryClient } from '@tanstack/react-query'
import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { apiClient, setAccessToken } from '@/lib/api-client'

interface UserProfile {
  id: string
  email: string
}

export function AccountControl() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => apiClient.get<UserProfile>('/auth/me'),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const signOut = () => {
    setAccessToken(null)
    queryClient.clear()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex items-center gap-2.5 px-3 py-2 min-w-0">
      <div className="w-7 h-7 rounded-full bg-brand-500/20 flex items-center justify-center shrink-0" aria-hidden="true">
        <span className="text-brand-300 text-xs font-bold">{data?.email?.[0]?.toUpperCase() ?? '?'}</span>
      </div>
      <span className="text-sm text-slate-400 truncate flex-1" title={data?.email ?? 'Account'}>
        {data?.email ?? (isLoading ? 'Loading account…' : 'Account')}
      </span>
      <button
        type="button"
        onClick={signOut}
        aria-label="Sign out"
        title="Sign out"
        className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-surface-200"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  )
}
