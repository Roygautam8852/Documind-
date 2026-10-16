/**
 * Typed API client for DocuMind backend.
 *
 * All backend requests go through this module. Never put server-side secrets
 * in frontend code. The JWT token is stored in memory (not localStorage) to
 * reduce XSS risk.
 */

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1'

// Token stored in memory with sessionStorage fallback for page refresh resilience
let _accessToken: string | null = typeof window !== 'undefined' ? window.sessionStorage.getItem('documind_token') : null

export function setAccessToken(token: string | null): void {
  _accessToken = token
  if (typeof window !== 'undefined') {
    if (token) {
      window.sessionStorage.setItem('documind_token', token)
    } else {
      window.sessionStorage.removeItem('documind_token')
    }
  }
}

export function getAccessToken(): string | null {
  return _accessToken
}

export interface ApiError {
  error_code: string
  message: string
  request_id: string
  detail?: unknown
  status: number
}

export class ApiRequestError extends Error {
  status: number
  error_code: string
  request_id: string
  detail?: unknown

  constructor(error: ApiError) {
    super(error.message)
    this.name = 'ApiRequestError'
    this.status = error.status
    this.error_code = error.error_code
    this.request_id = error.request_id
    this.detail = error.detail
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  params?: Record<string, string | number | boolean | undefined>
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, params, headers: extraHeaders, ...rest } = options

  // Build URL with query params
  const url = new URL(`${API_BASE}${path}`, window.location.origin)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.set(k, String(v))
    })
  }

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(extraHeaders as Record<string, string>),
  }

  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`
  }

  const response = await fetch(url.toString(), {
    ...rest,
    headers,
    body: isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    let errorData: Partial<ApiError> = {
      error_code: 'unknown_error',
      message: 'An unexpected error occurred.',
      request_id: response.headers.get('x-request-id') ?? 'unknown',
    }
    try {
      errorData = await response.json()
    } catch {
      // Use defaults
    }
    if (response.status === 401) {
      setAccessToken(null)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('documind:unauthorized'))
      }
    }
    throw new ApiRequestError({ ...errorData, status: response.status } as ApiError)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

// ── Convenience methods ────────────────────────────────────────────────────

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { method: 'GET', ...options }),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { method: 'POST', body, ...options }),

  upload: <T>(path: string, formData: FormData, options?: Omit<RequestOptions, 'body'>) =>
    request<T>(path, { method: 'POST', body: formData, ...options }),

  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { method: 'PUT', body, ...options }),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { method: 'PATCH', body, ...options }),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { method: 'DELETE', ...options }),
}
