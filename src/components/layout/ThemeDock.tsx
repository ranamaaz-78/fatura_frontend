import { Moon, Palette, Sun, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { THEME_SCHEMES, swatchColor } from '../../theme/schemes'
import { useTheme } from '../../theme/ThemeProvider'
import { Tooltip } from '../ui/Tooltip'

export function ThemeDock() {
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
    <div
      ref={rootRef}
      className="pointer-events-none fixed right-4 bottom-20 z-40 print:hidden lg:bottom-6"
    >
      {dockOpen ? (
        <div className="pointer-events-auto flex h-[200px] w-[200px] flex-col rounded-2xl border border-line bg-card p-2.5 shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold tracking-wider text-ink-muted uppercase">
              {t('theme.title', 'Theme')}
            </p>
            <Tooltip content={t('theme.close', 'Close colours')} align="end" side="bottom">
              <button
                type="button"
                aria-label={t('theme.close', 'Close colours')}
                onClick={() => setDockOpen(false)}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-ink-muted hover:bg-page hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </Tooltip>
          </div>

          <div className="mt-2 grid grid-cols-5 gap-1.5">
            {THEME_SCHEMES.map((item) => {
              const selected = scheme === item.id
              const label = t(item.labelKey, item.fallback)
              return (
                <Tooltip key={item.id} content={label}>
                  <button
                    type="button"
                    aria-label={label}
                    aria-pressed={selected}
                    onClick={() => setScheme(item.id)}
                    className={cn(
                      'flex h-7 w-7 cursor-pointer items-center justify-center rounded-full',
                      selected ? 'ring-2 ring-brand-600 ring-offset-1 ring-offset-card' : 'hover:ring-1 hover:ring-line',
                    )}
                  >
                    <span className="block h-5 w-5 rounded-full" style={{ background: swatchColor(item.id) }} />
                  </button>
                </Tooltip>
              )
            })}
          </div>

          <div className="mt-auto grid grid-cols-2 gap-1">
            <button
              type="button"
              aria-pressed={mode === 'light'}
              onClick={() => setMode('light')}
              className={cn(
                'inline-flex h-8 cursor-pointer items-center justify-center gap-1 rounded-xl text-[11px] font-semibold',
                mode === 'light' ? 'bg-brand-600 text-brand-on' : 'bg-page text-ink-muted hover:text-ink',
              )}
            >
              <Sun className="h-3.5 w-3.5" />
              {t('theme.light', 'Light')}
            </button>
            <button
              type="button"
              aria-pressed={mode === 'dark'}
              onClick={() => setMode('dark')}
              className={cn(
                'inline-flex h-8 cursor-pointer items-center justify-center gap-1 rounded-xl text-[11px] font-semibold',
                mode === 'dark' ? 'bg-brand-600 text-brand-on' : 'bg-page text-ink-muted hover:text-ink',
              )}
            >
              <Moon className="h-3.5 w-3.5" />
              {t('theme.dark', 'Dark')}
            </button>
          </div>
        </div>
      ) : (
        <Tooltip content={t('theme.open', 'Colours')} align="end">
          <button
            type="button"
            aria-label={t('theme.open', 'Colours')}
            onClick={() => setDockOpen(true)}
            className="pointer-events-auto flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-line bg-card text-brand-600 shadow-lg hover:bg-brand-50"
          >
            <Palette className="h-4 w-4" />
          </button>
        </Tooltip>
      )}
    </div>
  )
}
