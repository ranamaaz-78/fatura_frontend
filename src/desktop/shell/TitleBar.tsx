import { ChevronLeft, ChevronRight, Moon, Palette, Search, Sun } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { LanguageSwitcher } from '../../components/ui/LanguageSwitcher'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { isDesktop } from '../../lib/desktop'
import { THEME_SCHEMES, swatchColor } from '../../theme/schemes'
import { useTheme } from '../../theme/ThemeProvider'
import { crumbFor } from './routes'

/**
 * The window's own title bar: back and forward, where you are, the command search, and the theme. It is the part of
 * the window you drag; Windows draws its three buttons over the right end, so that end is left free.
 */
export function TitleBar({ admin, onSearch }: { admin: boolean; onSearch: () => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const crumb = crumbFor(location.pathname, admin)

  return (
    <header className="desk-chrome desk-drag relative z-40 flex h-[var(--desk-titlebar)] shrink-0 items-center gap-3 border-b border-white/8 pl-3 select-none print:hidden">
      <div className="desk-nodrag flex items-center gap-0.5">
        <ChromeButton label={t('common.back', 'Back')} onClick={() => navigate(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </ChromeButton>
        <ChromeButton label={t('common.next', 'Next')} onClick={() => navigate(1)}>
          <ChevronRight className="h-4 w-4" />
        </ChromeButton>
      </div>

      <p className="flex min-w-0 items-center gap-2 text-[12px]">
        <span className="truncate text-sidebar-muted">{crumb.group}</span>
        {crumb.page ? (
          <>
            <span className="text-white/25">/</span>
            <span className="truncate font-semibold text-white">{crumb.page}</span>
          </>
        ) : null}
      </p>

      <div className="flex flex-1 justify-center px-4">
        <button
          type="button"
          onClick={onSearch}
          className="desk-nodrag group flex h-7 w-full max-w-[440px] items-center gap-2.5 rounded-lg border border-white/10 bg-white/6 px-3 text-[12px] text-sidebar-muted transition hover:border-white/20 hover:bg-white/10 hover:text-white"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1 truncate text-left">{t('desk.searchOrJump', 'Search or jump to…')}</span>
          <kbd className="inline-flex items-center rounded-md border border-white/12 bg-white/6 px-1.5 py-px text-[10px] font-semibold text-sidebar-text">Ctrl K</kbd>
        </button>
      </div>

      <div className={cn('desk-nodrag flex items-center gap-1.5', isDesktop ? 'pr-[148px]' : 'pr-3')}>
        <ThemeMenu />
        <LanguageSwitcher tone="dark" />
      </div>
    </header>
  )
}

function ChromeButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-md text-sidebar-muted transition hover:bg-white/10 hover:text-white"
    >
      {children}
    </button>
  )
}

/** The website's colour dock, moved into the title bar: the same ten schemes and light / dark. */
function ThemeMenu() {
  const { scheme, mode, dockOpen, setScheme, setMode, setDockOpen } = useTheme()
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!dockOpen) return
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setDockOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setDockOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [dockOpen, setDockOpen])

  return (
    <div ref={rootRef} className="relative">
      <ChromeButton label={t('theme.open', 'Colours')} onClick={() => setDockOpen(!dockOpen)}>
        <Palette className="h-4 w-4" />
      </ChromeButton>
      {dockOpen ? (
        <div className="desk-glass-strong desk-pop absolute top-9 right-0 w-[248px] p-3 text-ink">
          <p className="text-[10px] font-semibold tracking-[0.12em] text-ink-muted uppercase">{t('theme.title', 'Theme')}</p>
          <div className="mt-2.5 grid grid-cols-5 gap-2">
            {THEME_SCHEMES.map((item) => {
              const selected = scheme === item.id
              const label = t(item.labelKey, item.fallback)
              return (
                <button
                  key={item.id}
                  type="button"
                  title={label}
                  aria-label={label}
                  aria-pressed={selected}
                  onClick={() => setScheme(item.id)}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-xl transition',
                    selected ? 'bg-elevated ring-2 ring-brand-600' : 'hover:bg-elevated',
                  )}
                >
                  <span className="block h-5 w-5 rounded-full shadow-inner" style={{ background: swatchColor(item.id) }} />
                </button>
              )
            })}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-elevated p-1">
            {(['light', 'dark'] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
                className={cn(
                  'inline-flex h-8 items-center justify-center gap-1.5 rounded-lg text-[12px] font-semibold transition',
                  mode === value ? 'bg-card text-ink shadow-sm' : 'text-ink-muted hover:text-ink',
                )}
              >
                {value === 'light' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                {value === 'light' ? t('theme.light', 'Light') : t('theme.dark', 'Dark')}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
