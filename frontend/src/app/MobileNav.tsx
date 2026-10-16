import { BookOpen, FileText, LogOut, MessageSquare } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { setAccessToken } from '@/lib/api-client'

const links = [
  { to: '/dashboard', label: 'Home', icon: BookOpen },
  { to: '/documents', label: 'Files', icon: FileText },
  { to: '/chat', label: 'Chat', icon: MessageSquare },
]

export function MobileNav() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const signOut = () => {
    setAccessToken(null)
    queryClient.clear()
    navigate('/login', { replace: true })
  }

  return (
    <header className="md:hidden sticky top-0 z-30 flex items-center justify-between gap-2 px-3 py-2 bg-surface-100 border-b border-surface-300">
      <span className="text-sm font-bold text-white shrink-0">DocuMind</span>
      <nav aria-label="Main navigation" className="flex items-center gap-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            aria-label={label}
            className={({ isActive }) => `p-2 rounded-md ${isActive ? 'text-brand-300 bg-brand-500/10' : 'text-slate-400'}`}
          >
            <Icon className="w-4 h-4" />
          </NavLink>
        ))}
        <button type="button" onClick={signOut} aria-label="Sign out" className="p-2 rounded-md text-slate-400">
          <LogOut className="w-4 h-4" />
        </button>
      </nav>
    </header>
  )
}
