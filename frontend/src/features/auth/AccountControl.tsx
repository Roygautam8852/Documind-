import { useQuery, useQueryClient } from '@tanstack/react-query'
import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { apiClient, setAccessToken } from '@/lib/api-client'

import { formatUserDisplayName } from '@/lib/formatters'

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
    <div className="flex items-center gap-2.5 px-2 py-2 min-w-0 rounded-xl bg-[#16171b] border border-[#202228]">
      <div className="w-7 h-7 rounded-full bg-[#b6f526] text-black flex items-center justify-center shrink-0 font-bold text-xs" aria-hidden="true">
        <span>{data?.email?.[0]?.toUpperCase() ?? 'G'}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-white truncate" title={data?.email ?? 'User'}>
          {data?.email ? formatUserDisplayName(data.email) : (isLoading ? 'Loading…' : 'Gautam Kumar')}
        </p>
        <p className="text-[10px] text-slate-400 truncate">Free Plan</p>
      </div>
      <button
        type="button"
        onClick={signOut}
        aria-label="Sign out"
        title="Sign out"
        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#202228] transition-colors"
      >
        <LogOut className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
