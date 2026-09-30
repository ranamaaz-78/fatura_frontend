import { AlertTriangle, CheckCircle2, Info, X, XCircle, type LucideIcon } from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'

export type ToastTone = 'success' | 'warning' | 'danger' | 'info'

export type ToastMessage = {
  id: string
  tone: ToastTone
  title: string
  actionLabel?: string
  onAction?: () => void
}

type ToastContextValue = {
  push: (toast: Omit<ToastMessage, 'id'> & { id?: string }) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const barColors: Record<ToastTone, string> = {
  success: 'bg-emerald-600',
  warning: 'bg-amber-500',
  danger: 'bg-rose-600',
  info: 'bg-brand-600',
}

const TOAST_DURATION_MS = 5000

const toneIcons: Record<ToastTone, LucideIcon> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  info: Info,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    (toast: Omit<ToastMessage, 'id'> & { id?: string }) => {
      const id = toast.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const next: ToastMessage = { ...toast, id }
      setToasts((current) => [...current, next])
    },
    [dismiss],
  )

  const value = useMemo(() => ({ push }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-[calc(env(safe-area-inset-top)+1rem)] inset-x-4 z-[60] flex flex-col gap-3 pointer-events-none md:inset-x-auto md:right-6 md:w-96">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  const [paused, setPaused] = useState(false)
  const [remaining, setRemaining] = useState(TOAST_DURATION_MS)
  const Icon = toneIcons[toast.tone]

  useEffect(() => {
    if (paused) return
    let last = performance.now()
    let left = remaining
    let frame = 0
    const tick = (now: number) => {
      left -= now - last
      last = now
      if (left <= 0) {
        onDismiss(toast.id)
        return
      }
      setRemaining(left)
      frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, toast.id, onDismiss])

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      role={toast.tone === 'danger' ? 'alert' : 'status'}
      className="pointer-events-auto relative bg-card rounded-2xl border border-line shadow-xl px-4 py-3.5 text-sm flex items-start gap-3 overflow-hidden"
    >
      <span
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white',
          barColors[toast.tone],
        )}
      >
        <Icon className="w-4 h-4" />
      </span>
      <div className="flex-1 min-w-0 pt-1">
        <p className="text-ink font-medium break-words">{toast.title}</p>
        {toast.actionLabel && toast.onAction ? (
          <button
            type="button"
            onClick={toast.onAction}
            className="mt-1 text-xs font-semibold text-brand-600"
          >
            {toast.actionLabel}
          </button>
        ) : null}
      </div>
      <button
        type="button"
        aria-label={t('common.close', 'Close')}
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-ink-muted hover:bg-line/60 hover:text-ink transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
      <span
        className={cn('absolute bottom-0 left-0 h-1', barColors[toast.tone])}
        style={{ width: `${(remaining / TOAST_DURATION_MS) * 100}%` }}
      />
    </div>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
