import { BookOpen, FileText, LogOut, MessageSquare, ArrowLeft } from 'lucide-react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
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
    <header className="md:hidden sticky top-0 z-30 flex items-center justify-between gap-2 px-4 py-2.5 bg-[#111215] border-b border-[#202228]">
      <div className="flex items-center gap-2">
        <Link
          to="/"
          aria-label="Back to Landing Page"
          title="Back to Landing Page"
          className="p-1.5 rounded-xl bg-[#1c1e24] text-slate-300 hover:text-white border border-[#262933] flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.2]" />
        </Link>
        <span className="text-sm font-bold text-white shrink-0 tracking-tight flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-[#b6f526] text-black flex items-center justify-center font-bold text-xs">D</span>
          DocuMind
        </span>
      </div>
      <nav aria-label="Main navigation" className="flex items-center gap-1.5">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            aria-label={label}
            className={({ isActive }) =>
              `p-2 rounded-xl transition-all ${
                isActive
                  ? 'text-black bg-[#b6f526] font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-[#1c1e24]'
              }`
            }
          >
            <Icon className="w-4 h-4" />
          </NavLink>
        ))}
        <button
          type="button"
          onClick={signOut}
          aria-label="Sign out"
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#1c1e24]"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </nav>
    </header>
  )
}
