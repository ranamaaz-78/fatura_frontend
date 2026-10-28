import { CornerDownLeft, FlaskConical, LogOut, Moon, Search, Sun, type LucideIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { docPermission, usePermissions } from '../../auth/permissions'
import { ADMIN_NAV, APP_NAV, navAllowed } from '../../components/layout/nav'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { useTheme } from '../../theme/ThemeProvider'
import { NEW_DOCUMENTS, newDocumentPath } from './routes'

type Entry = {
  id: string
  label: string
  section: string
  icon: LucideIcon
  hint?: string
  run: () => void
}

/** Ctrl+K: jump to any screen the person may open, start a document, or switch light / dark. Nothing else. */
export function CommandPalette({ admin, open, onClose }: { admin: boolean; open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const { logout, session, enterDemo, exitDemo } = useAuth()
  const { can, isOwner } = usePermissions()
  const { mode, setMode } = useTheme()
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const entries = useMemo<Entry[]>(() => {
    const go = (to: string) => () => navigate(to)
    const list: Entry[] = []

    if (!admin) {
      for (const doc of NEW_DOCUMENTS) {
        if (!can(docPermission(doc.type, 'create'))) continue
        list.push({ id: `new-${doc.type}`, label: doc.label, section: t('desk.create', 'Create'), icon: doc.icon, hint: doc.key, run: go(newDocumentPath(doc.type)) })
      }
    }

    for (const group of admin ? ADMIN_NAV : APP_NAV) {
      for (const item of group.items) {
        if (!admin && !navAllowed(item, can, isOwner)) continue
        list.push({
          id: item.to,
          label: t(item.labelKey, item.fallback),
          section: t(group.titleKey, group.titleFallback),
          icon: item.icon,
          run: go(item.to),
        })
      }
    }

    list.push({
      id: 'mode',
      label: mode === 'dark' ? t('theme.light', 'Light') : t('theme.dark', 'Dark'),
      section: t('theme.title', 'Theme'),
      icon: mode === 'dark' ? Sun : Moon,
      run: () => setMode(mode === 'dark' ? 'light' : 'dark'),
    })
    // Practice in the shared demo account (or come back out of it). Only for people inside a company.
    if (!admin && session?.company && (session.company.is_demo || session.demo_enabled !== false)) {
      list.push(
        session.company.is_demo
          ? { id: 'demo', label: t('demo.exit', 'Exit demo'), section: t('demo.mode', 'Demo mode'), icon: FlaskConical, run: () => void exitDemo() }
          : { id: 'demo', label: t('demo.enter', 'Practice in the demo'), section: t('demo.mode', 'Demo mode'), icon: FlaskConical, run: () => void enterDemo() },
      )
    }
    list.push({ id: 'logout', label: t('nav.logout', 'Log out'), section: t('nav.settings', 'Settings'), icon: LogOut, run: () => void logout() })
    return list
  }, [admin, can, enterDemo, exitDemo, isOwner, logout, mode, navigate, session?.company, session?.demo_enabled, setMode])

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return entries
    return entries.filter((entry) => `${entry.label} ${entry.section}`.toLowerCase().includes(needle))
  }, [entries, query])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setIndex(0)
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [open])

  useEffect(() => setIndex(0), [query])

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [index])

  if (!open) return null

  function choose(entry: Entry | undefined) {
    if (!entry) return
    onClose()
    entry.run()
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setIndex((current) => Math.min(current + 1, shown.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setIndex((current) => Math.max(current - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      choose(shown[index])
    } else if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
  }

  let lastSection = ''

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-overlay/60 pt-[12vh] backdrop-blur-sm print:hidden" onPointerDown={onClose}>
      <div className="desk-glass-strong desk-pop w-[600px] max-w-[calc(100vw-48px)] overflow-hidden" onPointerDown={(event) => event.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="h-4.5 w-4.5 text-ink-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t('desk.searchOrJump', 'Search or jump to…')}
            className="h-14 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-muted"
          />
          <kbd className="rounded-md border border-line bg-elevated px-1.5 py-0.5 text-[10px] font-semibold text-ink-muted">Esc</kbd>
        </div>

        <div ref={listRef} className="desk-scroll max-h-[420px] overflow-y-auto p-2">
          {shown.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-ink-muted">{t('common.noResults', 'No results')}</p>
          ) : (
            shown.map((entry, position) => {
              const Icon = entry.icon
              const header = entry.section !== lastSection ? entry.section : null
              lastSection = entry.section
              return (
                <div key={entry.id}>
                  {header ? <p className="px-3 pt-3 pb-1.5 text-[10px] font-semibold tracking-[0.12em] text-ink-muted uppercase">{header}</p> : null}
                  <button
                    type="button"
                    data-index={position}
                    onMouseEnter={() => setIndex(position)}
                    onClick={() => choose(entry)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-ink transition-colors',
                      position === index ? 'bg-brand-600 text-brand-on' : 'hover:bg-elevated',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-lg',
                        position === index ? 'bg-white/18' : 'bg-elevated text-brand-600',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 truncate">{entry.label}</span>
                    {entry.hint ? (
                      <kbd className={cn('rounded-md border px-1.5 py-0.5 text-[10px] font-semibold', position === index ? 'border-white/30' : 'border-line text-ink-muted')}>
                        {entry.hint}
                      </kbd>
                    ) : null}
                    {position === index ? <CornerDownLeft className="h-3.5 w-3.5 opacity-80" /> : null}
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
