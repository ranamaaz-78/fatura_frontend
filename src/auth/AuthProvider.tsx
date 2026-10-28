import { adoptLocale, setDocumentLocale, t } from '../i18n'
import { setLoginNotice } from '../lib/loginNotice'
import { beginDemoVisit, endDemoVisit, inDemoVisit } from '../demo/demoSession'
import { useToast } from '../components/ui/Toast'
import { useQueryClient } from '@tanstack/react-query'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { enterDemoRequest, exitDemoRequest } from '../services/demo'
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
  /** Goes into the shared demo account with the customer's own login, keeping their own token aside. */
  enterDemo: () => Promise<void>
  /** Comes out of the demo and puts the customer's own account back. */
  exitDemo: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function homeFor(role: string | undefined): string {
  return role === 'super_admin' ? '/admin/dashboard' : '/app/dashboard'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { push } = useToast()
  const [session, setSession] = useState<SessionPayload | null>(null)
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'guest'>(
    getAuthToken() ? 'loading' : 'guest',
  )

  const roleRef = useRef<string | undefined>(undefined)

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
      if (adoptLocale(payload.locale)) return
      setDocumentLocale(payload.company?.document_locale)
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
      onUnauthenticated: () => {
        // The demo's short visit ran out: the customer is put back on their own account, not signed out.
        if (inDemoVisit()) {
          const back = endDemoVisit()
          queryClient.clear()
          if (back) {
            push({ tone: 'info', title: t('demo.ended', 'Your demo session ended. You are back on your own account.') })
            navigate('/app/dashboard', { replace: true })
            void refresh()
            return
          }
        }
        clear()
      },
      onSubscriptionExpired: () => {
        // The owner goes to the Subscription page to renew; the team cannot, so they are signed out with the reason.
        if (roleRef.current === 'staff') {
          setLoginNotice(t('auth.teamExpired', 'Your company subscription has expired. Please contact your administrator.'))
          clear()
          navigate('/login', { replace: true })
          return
        }
        navigate('/app/settings?tab=subscription', { replace: true })
      },
      onBlocked: (message) => {
        if (message) setLoginNotice(message)
        clear()
        navigate('/login', { replace: true })
      },
    })
  }, [clear, navigate, push, queryClient, refresh])

  const adoptSession = useCallback(async (result: AuthResult) => {
    setAuthToken(result.token)
    const payload = await getSession()
    // A different language is waiting for this account: the page reloads into it.
    if (adoptLocale(payload.locale)) return
    setDocumentLocale(payload.company?.document_locale)
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

  const enterDemo = useCallback(async () => {
    const entry = await enterDemoRequest()
    beginDemoVisit(entry.token)
    // Everything on screen was the customer's own; none of it may carry over into the demo.
    queryClient.clear()
    await refresh()
    navigate('/app/dashboard')
  }, [navigate, queryClient, refresh])

  const exitDemo = useCallback(async () => {
    try {
      // With the demo's token still in place, so the server closes this visit.
      await exitDemoRequest()
    } catch {
      // A demo token that already ran out is as good as left.
    }
    const back = endDemoVisit()
    queryClient.clear()

    if (back) {
      navigate('/app/dashboard')
      await refresh()
    } else {
      clear()
      navigate('/login', { replace: true })
    }
  }, [clear, navigate, queryClient, refresh])

  const logout = useCallback(async () => {
    // Leaving from inside the demo means leaving the demo, not signing the customer out of their own account.
    if (inDemoVisit()) {
      await exitDemo()
      return
    }

    try {
      await logoutRequest()
    } catch {
      // A dead token is still a successful logout from the user's point of view.
    }
    clear()
    navigate('/login', { replace: true })
  }, [clear, exitDemo, navigate])

  roleRef.current = session?.role

  const value = useMemo(
    () => ({ session, status, login, adoptSession, logout, refresh, enterDemo, exitDemo }),
    [session, status, login, adoptSession, logout, refresh, enterDemo, exitDemo],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
