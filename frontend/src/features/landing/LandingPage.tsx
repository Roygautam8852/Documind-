import { Link } from 'react-router-dom'
import { FileText, Brain, Shield, Zap, Quote, ArrowRight, CheckCircle } from 'lucide-react'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-surface-0 text-slate-200">
      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <nav className="border-b border-surface-300/50 glass sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-white text-lg">DocuMind</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-ghost text-sm">Sign in</Link>
            <Link to="/register" className="btn-primary text-sm">Get started free</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="relative pt-24 pb-20 px-4 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-brand-600/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/25 text-brand-300 text-xs font-medium mb-8 animate-fade-in">
            <Zap className="w-3.5 h-3.5" />
            RAG-powered document intelligence
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold text-white mb-6 leading-tight animate-slide-up">
            Ask questions.<br />
            <span className="gradient-text">Get cited answers.</span>
          </h1>

          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed animate-slide-up">
            Upload your documents and have natural-language conversations with them.
            Every answer is grounded in your content with verifiable source citations.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up">
            <Link to="/register" className="btn-primary text-base px-6 py-3">
              Start for free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/login" className="btn-secondary text-base px-6 py-3">
              Sign in to your account
            </Link>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section className="py-20 px-4 border-t border-surface-300/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="heading-lg mb-3">How DocuMind works</h2>
            <p className="text-slate-400">From upload to verified answer in seconds</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                icon: FileText,
                title: 'Upload your documents',
                desc: 'Drop in PDFs, Word documents, or text files. We extract and index the content.',
              },
              {
                step: '02',
                icon: Brain,
                title: 'Ask any question',
                desc: 'Type your question naturally. We retrieve the most relevant passages from your documents.',
              },
              {
                step: '03',
                icon: Quote,
                title: 'Get cited answers',
                desc: 'Receive answers grounded in your content, with source references you can inspect.',
              },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="card p-6 relative overflow-hidden">
                <div className="absolute top-4 right-4 text-5xl font-bold text-surface-300/30 select-none">
                  {step}
                </div>
                <div className="w-10 h-10 rounded-lg bg-brand-500/15 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-brand-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="heading-lg mb-3">Built for accuracy</h2>
            <p className="text-slate-400">Evidence over generation. Every time.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: Shield, title: 'No hallucinated citations', desc: 'Every citation maps to an actual retrieved passage. If the answer isn\'t in your documents, we say so.' },
              { icon: CheckCircle, title: 'Verifiable sources', desc: 'Inspect the exact text excerpt behind every answer, with filename and page number.' },
              { icon: Brain, title: 'Semantic retrieval', desc: 'Vector search understands your questions — even when the exact words don\'t match.' },
              { icon: Zap, title: 'Multi-document queries', desc: 'Ask questions across multiple uploaded documents at once.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card-hover p-5 flex gap-4">
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-brand-500/15 flex items-center justify-center">
                  <Icon className="w-4.5 h-4.5 text-brand-400" />
                </div>
                <div>
                  <h3 className="font-medium text-white mb-1">{title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Privacy note ─────────────────────────────────────────────── */}
      <section className="py-12 px-4 border-t border-surface-300/30">
        <div className="max-w-3xl mx-auto text-center">
          <Shield className="w-6 h-6 text-brand-400 mx-auto mb-3" />
          <h3 className="font-semibold text-white mb-2">Your documents, your data</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Documents are processed and stored privately per account. Only the relevant
            excerpts needed to answer your question are sent to the AI provider —
            not your entire document. Your data is never used to train AI models.
          </p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-surface-300/30 py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Brain className="w-4 h-4" />
            <span>DocuMind — AI Document Intelligence</span>
          </div>
          <p className="text-xs text-slate-600">
            Phase 00 — Foundation build. Full features coming in subsequent phases.
          </p>
        </div>
      </footer>
    </div>
  )
}
