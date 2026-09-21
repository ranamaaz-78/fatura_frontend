import { useEffect, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type DrawerProps = {
  open: boolean
  onClose: () => void
  children: ReactNode
  side?: 'left' | 'right'
  /** Tailwind width classes. Wide panels need more room than the default nav drawer. */
  width?: string
}

export function Drawer({ open, onClose, children, side = 'left', width = 'w-72' }: DrawerProps) {
  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  const isLeft = side === 'left'

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="modal-backdrop absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
        onClick={onClose}
      />
      <aside
        className={cn(
          'fixed inset-y-0 z-50 bg-white shadow-lg overflow-y-auto',
          width,
          isLeft ? 'left-0 border-r border-slate-200' : 'right-0 border-l border-slate-200',
        )}
      >
        {children}
      </aside>
    </div>
  )
}
