import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Brain, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'
import { apiClient, setAccessToken } from '@/lib/api-client'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

const PASSWORD_REQS = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'Not too long', test: (p: string) => p.length <= 128 },
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
    <div className="min-h-screen bg-surface-0 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white text-xl">DocuMind</span>
        </div>

        <div className="card p-6">
          <h1 className="heading-md mb-1">Create your account</h1>
          <p className="text-sm text-muted mb-6">Start chatting with your documents</p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="input"
                placeholder="you@example.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="input pr-10"
                  placeholder="At least 8 characters"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password requirements */}
              {passwordVal.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {PASSWORD_REQS.map(req => (
                    <li key={req.label} className="flex items-center gap-1.5 text-xs">
                      <CheckCircle
                        className={`w-3.5 h-3.5 flex-shrink-0 transition-colors ${
                          req.test(passwordVal) ? 'text-emerald-400' : 'text-surface-500'
                        }`}
                      />
                      <span className={req.test(passwordVal) ? 'text-slate-400' : 'text-surface-500'}>
                        {req.label}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {errors.password && (
                <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-1.5">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className="input"
                placeholder="Repeat your password"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-red-400 mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            {serverError && (
              <div
                role="alert"
                className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
              >
                {serverError}
              </div>
            )}

            <button
              id="register-submit"
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full justify-center py-2.5"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-xs text-slate-500 mt-4 text-center leading-relaxed">
            By creating an account you agree that your uploaded documents
            are stored privately and processed only to answer your questions.
          </p>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
