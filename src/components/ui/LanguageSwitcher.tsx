import { Check, Globe } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { LOCALES, getLocale, setLocale, t, type Locale } from '../../i18n'
import { cn } from '../../lib/cn'
import { getErrorMessage } from '../../services/api'
import { saveAdminLocale, saveCompanyLocale } from '../../services/locale'
import { useToast } from './Toast'

/**
 * Changes the language. A visitor's choice is remembered in the browser; a signed-in owner's is saved for the
 * whole company, and a platform admin's for themselves. The page reloads so everything is rebuilt in it.
 * Staff follow their company and cannot change it.
 */
export function useChangeLanguage() {
  const { session } = useAuth()
  const { push } = useToast()
  const [pending, setPending] = useState(false)

  const canChange = session?.role !== 'staff'

  async function change(next: Locale) {
    if (!canChange || pending || next === getLocale()) return

    setPending(true)
    try {
      if (session?.role === 'business_admin') await saveCompanyLocale(next)
      else if (session?.role === 'super_admin') await saveAdminLocale(next)
      setLocale(next)
    } catch (error) {
      push({ tone: 'danger', title: getErrorMessage(error) })
      setPending(false)
    }
  }

  return { change, pending, canChange, current: getLocale() }
}

export type LanguageSwitcherProps = {
  /** Which kind of background it sits on. */
  tone?: 'dark' | 'light'
  /** pill: EN | ES in a row. menu: a labelled, full-width control for a sidebar. */
  variant?: 'pill' | 'menu'
  className?: string
}

export function LanguageSwitcher({ tone = 'light', variant = 'pill', className }: LanguageSwitcherProps) {
  const { change, pending, canChange, current } = useChangeLanguage()

  if (!canChange) return null

  const dark = tone === 'dark'

  const segmented = (
    <span
      role="group"
      aria-label={t('language.label', 'Language')}
      className={cn(
        'inline-flex items-center rounded-full border p-0.5',
        variant === 'menu' && 'w-full',
        dark ? 'border-white/20 bg-white/8' : 'border-[#dbe1ff] bg-white',
      )}
    >
      {LOCALES.map((locale) => {
        const on = locale.code === current
        return (
          <button
            key={locale.code}
            type="button"
            disabled={pending}
            aria-pressed={on}
            title={locale.label}
            onClick={() => void change(locale.code)}
            className={cn(
              'inline-flex h-8 cursor-pointer items-center justify-center rounded-full px-3 text-xs font-bold tracking-wide transition-colors focus-visible:ring-2 focus-visible:ring-[#4edea3] focus-visible:outline-none disabled:cursor-wait',
              variant === 'menu' && 'flex-1',
              on
                ? dark
                  ? 'bg-white text-[#0b1c30]'
                  : 'bg-[#004ac6] text-white'
                : dark
                  ? 'text-white/75 hover:text-white'
                  : 'text-[#434655] hover:text-[#004ac6]',
            )}
          >
            {variant === 'menu' ? locale.label : locale.short}
          </button>
        )
      })}
    </span>
  )

  if (variant === 'menu') {
    return (
      <div className={cn('flex flex-col gap-1.5', className)}>
        <span className="flex items-center gap-1.5 px-1 text-[10px] font-semibold tracking-wider text-sidebar-muted uppercase">
          <Globe className="h-3 w-3" />
          {t('language.label', 'Language')}
        </span>
        {segmented}
      </div>
    )
  }

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Globe className={cn('h-4 w-4', dark ? 'text-white/70' : 'text-[#64748b]')} aria-hidden="true" />
      {segmented}
    </span>
  )
}

export type LanguageChoiceProps = {
  value: Locale
  onChange: (locale: Locale) => void
  disabled?: boolean
  busy?: Locale | null
}

const DESCRIPTIONS: Record<Locale, string> = {
  en: 'Use the app in English',
  es: 'Usa la aplicación en español',
}

/** Two big cards, for the places where choosing the language is the point (the setup step, Settings). */
export function LanguageChoice({ value, onChange, disabled, busy = null }: LanguageChoiceProps) {
  return (
    <div role="radiogroup" aria-label={t('language.label', 'Language')} className="grid gap-3 sm:grid-cols-2">
      {LOCALES.map((locale) => {
        const on = locale.code === value
        return (
          <button
            key={locale.code}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled || busy !== null}
            onClick={() => onChange(locale.code)}
            className={cn(
              'flex cursor-pointer items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all focus-visible:ring-2 focus-visible:ring-[#004ac6]/40 focus-visible:outline-none disabled:cursor-not-allowed',
              on ? 'border-[#004ac6] bg-[#eff4ff] shadow-[0_8px_22px_rgba(0,74,198,0.12)]' : 'border-[#dbe1ff] bg-white hover:border-[#9db6ff]',
              (disabled || busy !== null) && !on && 'opacity-60',
            )}
          >
            <span
              className={cn(
                'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold tracking-wide',
                on ? 'bg-[#004ac6] text-white' : 'bg-[#f1f5ff] text-[#434655]',
              )}
            >
              {locale.short}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[17px] font-bold text-[#0b1c30]">{locale.label}</span>
              <span className="block text-[13px] text-[#64748b]">{DESCRIPTIONS[locale.code]}</span>
            </span>
            {on ? (
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#004ac6] text-white">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
