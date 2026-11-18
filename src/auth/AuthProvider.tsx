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

/** How long someone may do nothing before they are signed out when the server does not say (it does, with the session). */
const DEFAULT_IDLE_MINUTES = 30
const ACTIVITY_KEY = 'last_activity'
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'] as const

function readActivity(): number {
  try {
    return Number(window.localStorage.getItem(ACTIVITY_KEY)) || Date.now()
  } catch {
    return Date.now()
  }
}

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
    // Leaving the demo's token behind would make the next sign-in look like a demo visit.
    endDemoVisit()
    setAuthToken(null)
    try {
      window.localStorage.removeItem(ACTIVITY_KEY)
    } catch {
      /* nothing to forget */
    }
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

    // Signing out by hand: the Windows app forgets the remembered password (the email stays).
    void window.desktop?.credentials?.clearPassword()

    try {
      await logoutRequest()
    } catch {
      // A dead token is still a successful logout from the user's point of view.
    }
    clear()
    navigate('/login', { replace: true })
  }, [clear, exitDemo, navigate])

  roleRef.current = session?.role
  const idleMinutes = session?.idle_minutes && session.idle_minutes > 0 ? session.idle_minutes : DEFAULT_IDLE_MINUTES

  // Thirty minutes without touching the screen: signed out, wherever the person is. The time of the last touch is
  // shared by every tab and window, so working in one keeps the others alive, and a laptop that slept is checked on waking.
  useEffect(() => {
    if (status !== 'authenticated') return

    const stamp = () => {
      try {
        window.localStorage.setItem(ACTIVITY_KEY, String(Date.now()))
      } catch {
        /* private window: the check then only counts from this tab */
      }
    }

    let leaving = false
    const idleOut = async () => {
      if (leaving) return
      leaving = true
      setLoginNotice(t('auth.idleLogout', 'You were signed out after {minutes} minutes without activity. Please sign in again.', { minutes: idleMinutes }))
      try {
        await logoutRequest()
      } catch {
        // A token the server already dropped is as good as signed out.
      }
      clear()
      navigate('/login', { replace: true })
    }

    const check = () => {
      if (Date.now() - readActivity() >= idleMinutes * 60_000) void idleOut()
    }

    // Opening the page after a long absence counts as being away; opening it fresh counts as a touch.
    check()
    if (!leaving) stamp()

    let lastWrite = Date.now()
    const touched = () => {
      const now = Date.now()
      if (now - lastWrite > 5000) {
        lastWrite = now
        stamp()
      }
    }

    // Signed out in another tab: this one follows.
    const otherTab = (event: StorageEvent) => {
      if (event.key === 'token' && event.newValue === null) {
        clear()
        navigate('/login', { replace: true })
      }
    }

    for (const name of ACTIVITY_EVENTS) window.addEventListener(name, touched, { passive: true })
    window.addEventListener('focus', check)
    window.addEventListener('storage', otherTab)
    document.addEventListener('visibilitychange', check)
    const timer = window.setInterval(check, 15_000)

    return () => {
      for (const name of ACTIVITY_EVENTS) window.removeEventListener(name, touched)
      window.removeEventListener('focus', check)
      window.removeEventListener('storage', otherTab)
      document.removeEventListener('visibilitychange', check)
      window.clearInterval(timer)
    }
  }, [clear, idleMinutes, navigate, status])

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
