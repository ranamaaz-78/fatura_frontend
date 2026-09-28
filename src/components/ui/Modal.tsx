import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { IconButton } from './IconButton'

const widthClasses = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  '2xl': 'sm:max-w-2xl',
  '4xl': 'sm:max-w-4xl',
} as const

export type ModalProps = {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  maxWidth?: keyof typeof widthClasses
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'lg',
}: ModalProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return

    // Remember who opened the dialog. Typing must not rerun this, or the
    // cleanup pulls focus back out of the field on the next letter.
    const trigger = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCloseRef.current()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
      if (trigger instanceof HTMLElement) trigger.focus()
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end md:items-center justify-center p-0 md:p-4 text-center sm:p-0">
        <div
          className="modal-backdrop fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className={cn(
            'relative transform overflow-hidden bg-white text-left shadow-2xl transition-all w-full border border-slate-100 z-10',
            'rounded-t-2xl md:rounded-2xl md:my-8',
            widthClasses[maxWidth],
          )}
        >
          <div className="md:hidden flex justify-center pt-2">
            <span className="h-1 w-10 rounded-full bg-slate-300" />
          </div>
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
            <div>
              <h3 id={titleId} className="text-base font-semibold text-slate-900">
                {title}
              </h3>
              {subtitle ? <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p> : null}
            </div>
            <IconButton label={t('common.close', 'Close')} tooltipAlign="end" tooltipSide="bottom" onClick={onClose}>
              <X className="w-5 h-5" />
            </IconButton>
          </div>
          <div className="px-6 py-5 max-h-[80vh] overflow-y-auto">{children}</div>
          {footer ? (
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
