import { useQueryClient } from '@tanstack/react-query'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { getSession, login as loginRequest, logout as logoutRequest } from '../services/auth'
import { getAuthToken, setAuthToken, setSessionHandlers } from '../services/api'
import type { AuthResult } from '../services/auth'
import type { SessionPayload } from '../types/module01'

type AuthContextValue = {
  session: SessionPayload | null
  status: 'loading' | 'authenticated' | 'guest'
  login: (email: string, password: string) => Promise<AuthResult>
  adoptSession: (result: AuthResult) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function homeFor(role: string | undefined): string {
  return role === 'super_admin' ? '/admin/dashboard' : '/app/dashboard'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [session, setSession] = useState<SessionPayload | null>(null)
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'guest'>(
    getAuthToken() ? 'loading' : 'guest',
  )

  const clear = useCallback(() => {
    setAuthToken(null)
    setSession(null)
    setStatus('guest')
    queryClient.clear()
  }, [queryClient])

  const refresh = useCallback(async () => {
    if (!getAuthToken()) {
      setSession(null)
      setStatus('guest')
      return
    }
    try {
      const payload = await getSession()
      setSession(payload)
      setStatus('authenticated')
    } catch {
      clear()
    }
  }, [clear])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    setSessionHandlers({
      onUnauthenticated: () => clear(),
      onSubscriptionExpired: () => navigate('/app/subscription', { replace: true }),
    })
  }, [clear, navigate])

  const adoptSession = useCallback(async (result: AuthResult) => {
    setAuthToken(result.token)
    const payload = await getSession()
    setSession(payload)
    setStatus('authenticated')
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await loginRequest({ email, password })
      await adoptSession(result)
      return result
    },
    [adoptSession],
  )

  const logout = useCallback(async () => {
    try {
      await logoutRequest()
    } catch {
      // A dead token is still a successful logout from the user's point of view.
    }
    clear()
    navigate('/login', { replace: true })
  }, [clear, navigate])

  const value = useMemo(
    () => ({ session, status, login, adoptSession, logout, refresh }),
    [session, status, login, adoptSession, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
