import { MoreVertical, type LucideIcon } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { IconButton } from './IconButton'

export type RowMenuItem = { label: string; icon: LucideIcon; onSelect: () => void; destructive?: boolean }

/** A small "more" menu. It is portalled so the table's scroll area cannot clip it. */
export function RowMenu({ items }: { items: RowMenuItem[] }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null)
  const anchor = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!open || !anchor.current) return
    const rect = anchor.current.getBoundingClientRect()
    const right = window.innerWidth - rect.right
    const needed = items.length * 42 + 16
    // Open upwards when there is no room below, for example on the last row of a phone screen.
    if (rect.bottom + 6 + needed > window.innerHeight) setPos({ bottom: window.innerHeight - rect.top + 6, right })
    else setPos({ top: rect.bottom + 6, right })
  }, [open, items.length])

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && close()
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={anchor}>
      <IconButton
        label={t('common.more', 'More')}
        tooltipAlign="end"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreVertical className="h-4 w-4" />
      </IconButton>
      {open && pos
        ? createPortal(
            <>
              <div className="fixed inset-0 z-50" onClick={() => setOpen(false)} />
              <div
                role="menu"
                style={{ top: pos.top, bottom: pos.bottom, right: pos.right }}
                className="fixed z-[51] w-52 overflow-hidden rounded-xl border border-line bg-card p-1 shadow-lg"
              >
                {items.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setOpen(false)
                      item.onSelect()
                    }}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition-colors hover:bg-page',
                      item.destructive ? 'text-rose-600' : 'text-ink',
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </button>
                ))}
              </div>
            </>,
            document.body,
          )
        : null}
    </div>
  )
}
