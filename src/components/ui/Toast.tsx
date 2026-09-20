import { X } from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { IconButton } from './IconButton'

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
  info: 'bg-blue-600',
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
      if (toast.tone !== 'danger') {
        window.setTimeout(() => dismiss(id), 4000)
      }
    },
    [dismiss],
  )

  const value = useMemo(() => ({ push }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-[calc(env(safe-area-inset-top)+1rem)] inset-x-4 z-[60] flex flex-col gap-2 md:inset-auto md:top-auto md:bottom-6 md:right-6 md:w-80">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="bg-white rounded-xl border border-slate-200 shadow-lg px-4 py-3 text-sm flex items-start gap-3 overflow-hidden"
          >
            <span className={cn('w-1 self-stretch rounded-full shrink-0', barColors[toast.tone])} />
            <div className="flex-1 min-w-0">
              <p className="text-slate-800">{toast.title}</p>
              {toast.actionLabel && toast.onAction ? (
                <button
                  type="button"
                  onClick={toast.onAction}
                  className="mt-1 text-xs font-semibold text-blue-700"
                >
                  {toast.actionLabel}
                </button>
              ) : null}
            </div>
            <IconButton label={t('common.close', 'Close')} onClick={() => dismiss(toast.id)} className="min-w-0 min-h-0">
              <X className="w-4 h-4" />
            </IconButton>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
