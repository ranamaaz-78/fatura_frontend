import { useEffect, type ReactNode } from 'react'

export type DrawerProps = {
  open: boolean
  onClose: () => void
  children: ReactNode
  side?: 'left' | 'right'
}

export function Drawer({ open, onClose, children, side = 'left' }: DrawerProps) {
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
        className={
          isLeft
            ? 'fixed inset-y-0 left-0 w-72 z-50 bg-white shadow-lg border-r border-slate-200 overflow-y-auto'
            : 'fixed inset-y-0 right-0 w-72 z-50 bg-white shadow-lg border-l border-slate-200 overflow-y-auto'
        }
      >
        {children}
      </aside>
    </div>
  )
}
