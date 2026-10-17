import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  FileText,
  Brain,
  Shield,
  Quote,
  ArrowRight,
  ArrowUpRight,
  CheckCircle,
  Sparkles,
  Layers,
  Scale,
  Cpu,
} from 'lucide-react'
import { getAccessToken, apiClient } from '@/lib/api-client'

export function LandingPage() {
  const token = getAccessToken()
  const { data: userProfile } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => apiClient.get<{ id: string; email: string }>('/auth/me'),
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const isLoggedIn = Boolean(token)

  return (
    <div className="min-h-screen bg-[#F4F5F7] text-gray-900 selection:bg-[#b6f526] selection:text-black">
      {/* ── Top Navigation Bar ────────────────────────────────────────── */}
      <header className="bg-[#111215] text-white sticky top-0 z-50 border-b border-[#202228]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-black font-bold shadow-sm">
              <Brain className="w-4 h-4 text-black" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">DocuMind</span>
          </Link>
          {isLoggedIn ? (
            <div className="flex items-center gap-2.5">
              <Link
                to="/dashboard"
                className="text-sm font-semibold text-slate-300 hover:text-white px-3 py-2 rounded-xl hover:bg-[#1c1e24] transition-colors"
              >
                Dashboard
              </Link>
              <Link
                to="/documents"
                className="text-sm font-semibold text-slate-300 hover:text-white px-3 py-2 rounded-xl hover:bg-[#1c1e24] transition-colors hidden sm:inline-block"
              >
                Documents
              </Link>
              <Link
                to="/chat"
                className="bg-[#b6f526] hover:bg-[#a5e61c] text-black font-bold text-sm px-4 py-2 rounded-xl transition-all shadow-sm shadow-[#b6f526]/20 active:scale-95 flex items-center gap-1.5"
              >
                <span>Go to Chat</span>
                <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
              </Link>
              <Link
                to="/dashboard"
                className="w-8 h-8 rounded-full bg-[#1c1e24] hover:bg-[#252830] border border-[#2d303a] text-white font-bold flex items-center justify-center text-xs transition-colors"
                title={userProfile?.email ?? 'Logged in'}
              >
                {userProfile?.email ? userProfile.email[0].toUpperCase() : 'U'}
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-sm font-semibold text-slate-300 hover:text-white px-3 py-2 rounded-xl hover:bg-[#1c1e24] transition-colors"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="bg-[#b6f526] hover:bg-[#a5e61c] text-black font-bold text-sm px-4 py-2.5 rounded-xl transition-all shadow-sm shadow-[#b6f526]/20 active:scale-95 flex items-center gap-1.5"
              >
                <span>Get started free</span>
                <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* ── Hero Section ─────────────────────────────────────────────── */}
      <section className="pt-16 pb-12 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm text-xs font-semibold text-gray-800">
            <span className="w-2 h-2 rounded-full bg-[#b6f526]" />
            <span className="font-mono text-gray-500">DocuMind Intelligence</span>
            <span className="text-gray-300">•</span>
            <span>RAG-Powered Document Workspace</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight">
            Ask questions.{' '}
            <span className="inline-block bg-[#b6f526] text-black px-4 py-1 rounded-2xl shadow-sm rotate-[-1deg]">
              Get cited answers.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Upload your documents and have natural conversations with them. Every answer is grounded in
            your content with verifiable source citations and page references.
          </p>

          {isLoggedIn ? (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                to="/chat"
                className="w-full sm:w-auto bg-[#b6f526] hover:bg-[#a5e61c] text-black font-bold text-base px-8 py-3.5 rounded-2xl transition-all shadow-md shadow-[#b6f526]/25 active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Open Chat Intelligence</span>
                <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
              </Link>
              <Link
                to="/dashboard"
                className="w-full sm:w-auto bg-[#111215] hover:bg-[#1c1e24] text-white font-semibold text-base px-8 py-3.5 rounded-2xl transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                to="/register"
                className="w-full sm:w-auto bg-[#b6f526] hover:bg-[#a5e61c] text-black font-bold text-base px-8 py-3.5 rounded-2xl transition-all shadow-md shadow-[#b6f526]/25 active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Start for free</span>
                <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto bg-[#111215] hover:bg-[#1c1e24] text-white font-semibold text-base px-8 py-3.5 rounded-2xl transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Sign in to workspace</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>

        {/* ── Interactive EchoAI Mockup (Directly reflecting user's screenshot) ── */}
        <div className="max-w-5xl mx-auto mt-12 bg-[#111215] rounded-[32px] p-2.5 sm:p-4 shadow-2xl border border-[#202228]">
          <div className="bg-white rounded-[26px] p-6 sm:p-10 border border-gray-100 space-y-8">
            {/* Window header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 text-sm">DocuMind 1.0</span>
                <span className="text-xs text-gray-400">⌵</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xs">
                  ⎋
                </div>
                <div className="w-7 h-7 rounded-full bg-[#b6f526] text-black font-bold flex items-center justify-center text-xs">
                  OB
                </div>
              </div>
            </div>

            {/* Greeting */}
            <div className="text-center space-y-1.5 pt-2">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                Hello, Olivia Brooks
              </h2>
              <p className="text-xl sm:text-2xl font-medium text-gray-500">
                Let's make your research easier.
              </p>
              <p className="text-xs text-gray-400 pt-1">
                Your personal AI assistant for documents, research, and knowledge.
              </p>
            </div>

            {/* Central Floating Prompt Input */}
            <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-gray-200/90 shadow-lg shadow-black/[0.04] p-4 space-y-4">
              <div className="text-gray-400 text-sm pl-1 select-none">Ask Anything...</div>
              <div className="flex items-center justify-between pt-2">
                <div className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 text-base font-bold cursor-pointer transition-colors">
                  +
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-gray-400 text-xs px-2 cursor-pointer">ılılı</div>
                  <div className="w-9 h-9 rounded-full bg-[#111215] text-white flex items-center justify-center font-bold shadow-sm cursor-pointer hover:bg-black transition-colors">
                    ↑
                  </div>
                </div>
              </div>
            </div>

            {/* 3 Echo Prompt Cards (exact match from user image) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="card-prompt">
                <div className="icon-container-lime">
                  <FileText className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1">Legal Insights</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Explore the latest updates and key discussions on legal topics today.
                  </p>
                </div>
              </div>

              <div className="card-prompt">
                <div className="icon-container-lime">
                  <Scale className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1">Global Justice</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Discover important trends and changes shaping international law.
                  </p>
                </div>
              </div>

              <div className="card-prompt">
                <div className="icon-container-lime">
                  <Cpu className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1">Modern Law & Technology</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Explore the latest updates and key discussions on legal topics today.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 bg-white border-y border-gray-200/80">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <span className="badge-neon">Fast & Grounded</span>
            <h2 className="heading-xl">How DocuMind works</h2>
            <p className="text-gray-500 text-sm">From document upload to verified answers in seconds</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                icon: FileText,
                title: 'Upload documents',
                desc: 'Drop in PDFs, Word docs, or text files. DocuMind chunks and indexes passages.',
              },
              {
                step: '02',
                icon: Brain,
                title: 'Ask questions',
                desc: 'Type your inquiry naturally. Hybrid search retrieves the highest-confidence facts.',
              },
              {
                step: '03',
                icon: Quote,
                title: 'Get cited answers',
                desc: 'Gemini 3.8 Flash synthesizes verified answers accompanied by verifiable [S1] source citations.',
              },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="card p-6 relative overflow-hidden group">
                <div className="absolute top-4 right-4 text-4xl font-extrabold text-gray-100 select-none group-hover:text-gray-200 transition-colors">
                  {step}
                </div>
                <div className="w-11 h-11 rounded-xl bg-[#b6f526] text-black flex items-center justify-center font-bold mb-4 shadow-sm">
                  <Icon className="w-5 h-5 text-black" />
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-2">{title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Built for Accuracy Grid ──────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <span className="badge-neon">Quality Guardrails</span>
            <h2 className="heading-xl">Built for accuracy</h2>
            <p className="text-gray-500 text-sm">Evidence over generation. Every single time.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                icon: Shield,
                title: 'No hallucinated citations',
                desc: 'Every reference directly links to verified chunks. If information is absent, the system explicitly states it.',
              },
              {
                icon: CheckCircle,
                title: 'Verifiable sources',
                desc: 'Inspect exact source snippets, similarity rankings, and page numbers with a single click.',
              },
              {
                icon: Sparkles,
                title: 'Gemini 3.8 Flash generative power',
                desc: 'State-of-the-art reasoning produces beautifully structured, professional answers and summaries.',
              },
              {
                icon: Layers,
                title: 'Multi-document synthesis',
                desc: 'Ask questions across entire library collections or filter to a single specific contract or CV.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card-hover p-6 flex gap-4 bg-white">
                <div className="w-10 h-10 rounded-xl bg-[#b6f526] text-black flex items-center justify-center shrink-0 font-bold shadow-sm">
                  <Icon className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1">{title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="bg-[#111215] text-slate-400 border-t border-[#202228] py-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-white font-bold">
            <div className="w-6 h-6 rounded-lg bg-[#b6f526] text-black flex items-center justify-center font-bold text-xs">
              D
            </div>
            <span>DocuMind Intelligence</span>
          </div>
          <p className="text-xs text-slate-500">
            Powered by Google Gemini 3.8 Flash & Vector Search. Built for precision document synthesis.
          </p>
        </div>
      </footer>
    </div>
  )
}
