import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Brain, Eye, EyeOff, Loader2, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react'
import { apiClient, setAccessToken } from '@/lib/api-client'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

const PASSWORD_REQS = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'Not too long (≤128 chars)', test: (p: string) => p.length <= 128 },
]

export function RegisterPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const passwordVal = watch('password', '')

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    try {
      const res = await apiClient.post<{ access_token: string }>('/auth/register', {
        email: data.email,
        password: data.password,
      })
      setAccessToken(res.access_token)
      navigate('/dashboard')
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Registration failed. Please try again.'
      setServerError(msg)
    }
  }

  return (
    <div className="min-h-screen bg-[#111215] flex flex-col items-center justify-center p-4 selection:bg-[#b6f526] selection:text-black relative">
      {/* Top Left Back Button */}
      <Link
        to="/"
        className="fixed top-6 left-6 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1c1e24] hover:bg-[#252830] border border-[#2d303a] text-slate-300 hover:text-white font-semibold text-xs transition-all shadow-md active:scale-95 z-20"
        title="Back to Landing Page"
        aria-label="Back to Landing Page"
      >
        <ArrowLeft className="w-4 h-4 stroke-[2.2]" />
        <span>Back to Home</span>
      </Link>

      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#b6f526]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Brand header */}
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-10 h-10 rounded-2xl bg-[#b6f526] flex items-center justify-center text-black font-bold shadow-lg shadow-[#b6f526]/20">
            <Brain className="w-5 h-5 text-black" />
          </div>
          <span className="font-extrabold text-white text-2xl tracking-tight">DocuMind</span>
        </div>

        {/* White Card Container */}
        <div className="bg-white rounded-[28px] p-8 shadow-2xl border border-gray-100">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Create your account</h1>
            <p className="text-xs text-gray-500 mt-1">Start chatting with verified document intelligence</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="w-full bg-[#f8f9fa] border border-gray-200 text-gray-900 placeholder-gray-400 rounded-xl px-4 py-2.5 text-sm transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#b6f526] focus:border-transparent"
                placeholder="you@example.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-red-500 mt-1 font-medium">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="w-full bg-[#f8f9fa] border border-gray-200 text-gray-900 placeholder-gray-400 rounded-xl px-4 py-2.5 pr-10 text-sm transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#b6f526] focus:border-transparent"
                  placeholder="At least 8 characters"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password requirements */}
              {passwordVal.length > 0 && (
                <ul className="mt-2 space-y-1 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  {PASSWORD_REQS.map((req) => (
                    <li key={req.label} className="flex items-center gap-2 text-xs">
                      <CheckCircle
                        className={`w-3.5 h-3.5 flex-shrink-0 transition-colors ${
                          req.test(passwordVal) ? 'text-[#3e680a]' : 'text-gray-300'
                        }`}
                      />
                      <span className={req.test(passwordVal) ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                        {req.label}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {errors.password && (
                <p className="text-xs text-red-500 mt-1 font-medium">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className="w-full bg-[#f8f9fa] border border-gray-200 text-gray-900 placeholder-gray-400 rounded-xl px-4 py-2.5 text-sm transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#b6f526] focus:border-transparent"
                placeholder="Repeat your password"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-red-500 mt-1 font-medium">{errors.confirmPassword.message}</p>
              )}
            </div>

            {serverError && (
              <div
                role="alert"
                className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5"
              >
                {serverError}
              </div>
            )}

            <button
              id="register-submit"
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#b6f526] hover:bg-[#a5e61c] text-black font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-md shadow-[#b6f526]/20 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>Creating account…</span>
                </>
              ) : (
                <>
                  <span>Create account</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>

          <p className="text-[11px] text-gray-400 mt-4 text-center leading-relaxed">
            By creating an account, your uploaded documents remain completely private and confidential.
          </p>

          <div className="mt-6 pt-5 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="text-gray-900 font-bold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
