import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type DrawerProps = {
  open: boolean
  onClose: () => void
  children: ReactNode
  side?: 'left' | 'right'
  /** Tailwind width classes. Wide panels need more room than the default nav drawer. */
  width?: string
}

const SLIDE_MS = 300

export function Drawer({ open, onClose, children, side = 'left', width = 'w-72' }: DrawerProps) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      return
    }

    setShown(false)
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(() => setMounted(false), reduceMotion ? 0 : SLIDE_MS)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!mounted || !open) return
    // Paint the off-screen position first, then slide in on the next frame.
    const frame = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(frame)
  }, [mounted, open])

  useEffect(() => {
    if (!mounted) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCloseRef.current()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [mounted])

  if (!mounted) return null

  const isLeft = side === 'left'

  return (
    <div className="fixed inset-0 z-50">
      <div
        className={cn(
          'modal-backdrop absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 ease-out',
          shown ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          'fixed inset-y-0 z-50 bg-white shadow-lg overflow-y-auto transition-transform duration-300 ease-out',
          width,
          isLeft ? 'left-0 border-r border-slate-200' : 'right-0 border-l border-slate-200',
          shown ? 'translate-x-0' : isLeft ? '-translate-x-full' : 'translate-x-full',
        )}
      >
        {children}
      </aside>
    </div>
  )
}
