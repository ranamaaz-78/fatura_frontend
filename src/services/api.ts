import axios, { isAxiosError } from 'axios'
import type { ApiSuccess } from '../types/api'

const TOKEN_KEY = 'token'

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setAuthToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

type SessionHandlers = {
  onUnauthenticated?: () => void
  onSubscriptionExpired?: () => void
}

let handlers: SessionHandlers = {}

export function setSessionHandlers(next: SessionHandlers): void {
  handlers = next
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isAxiosError(error)) {
      const status = error.response?.status
      const code = (error.response?.data as { code?: string } | undefined)?.code

      if (status === 401) handlers.onUnauthenticated?.()
      if (status === 402 && code === 'SUBSCRIPTION_EXPIRED') handlers.onSubscriptionExpired?.()
    }
    return Promise.reject(error)
  },
)

/** Unwraps the `{ success, message, data }` envelope every YK Digital Solutions endpoint returns. */
export async function unwrap<T>(promise: Promise<{ data: ApiSuccess<T> }>): Promise<T> {
  const response = await promise
  return response.data.data
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined
    return data?.message || error.message || fallback
  }
  if (error instanceof Error) return error.message
  return fallback
}

export function getErrorCode(error: unknown): string | null {
  if (!isAxiosError(error)) return null
  return (error.response?.data as { code?: string } | undefined)?.code ?? null
}

export function mapValidationErrors(error: unknown): Record<string, string> {
  if (!isAxiosError(error)) return {}
  const raw = (error.response?.data as { errors?: Record<string, string[] | string> } | undefined)?.errors
  if (!raw) return {}

  const mapped: Record<string, string> = {}
  for (const [field, value] of Object.entries(raw)) {
    mapped[field] = Array.isArray(value) ? (value[0] ?? '') : value
  }
  return mapped
}
