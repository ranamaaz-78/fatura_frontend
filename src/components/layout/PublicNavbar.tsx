import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { useActiveSection, useScrolled } from '../../pages/public/landing/hooks'
import { LANDING_SECTIONS } from '../../pages/public/landing/sections'
import { Logo } from '../brand/Logo'
import { LanguageSwitcher } from '../ui/LanguageSwitcher'
import { Tooltip } from '../ui/Tooltip'

/** The site is one page, so every link scrolls to a section of it. */
const LINKS = [
  { id: 'features', key: 'nav.features', fallback: 'Features' },
  { id: 'documents', key: 'nav.documents', fallback: 'Documents' },
  { id: 'how', key: 'nav.howItWorks', fallback: 'How it works' },
  { id: 'pricing', key: 'nav.pricing', fallback: 'Pricing' },
  { id: 'about', key: 'nav.about', fallback: 'About' },
  { id: 'faq', key: 'nav.faq', fallback: 'FAQ' },
  { id: 'contact', key: 'nav.contact', fallback: 'Contact' },
]

export function PublicNavbar() {
  const [open, setOpen] = useState(false)
  const scrolled = useScrolled()
  const active = useActiveSection(LANDING_SECTIONS)

  // Clear over the dark hero, solid white once the page has moved (or the menu is open).
  const solid = scrolled || open

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 transition-all duration-300',
        solid
          ? 'border-b border-[#e5eeff] bg-white/95 shadow-[0_8px_30px_rgba(2,6,23,0.08)] backdrop-blur-xl'
          : 'border-b border-transparent',
      )}
    >
      <div className="mx-auto flex h-20 max-w-[1320px] items-center justify-between gap-4 px-5">
        <a href="#top" onClick={() => setOpen(false)} className="flex shrink-0 items-center" aria-label={t('app.name', 'YK Digital Solutions')}>
          <Logo on={solid ? 'light' : 'dark'} className="h-12 sm:h-14" />
        </a>

        <nav aria-label={t('nav.main', 'Main')} className="hidden items-center gap-1 xl:flex">
          {LINKS.map((link) => {
            const on = active === link.id
            return (
              <a
                key={link.id}
                href={`#${link.id}`}
                aria-current={on ? 'true' : undefined}
                className={cn(
                  'relative rounded-lg px-2.5 py-2 text-[15px] font-medium whitespace-nowrap transition-colors 2xl:px-3.5',
                  solid
                    ? on
                      ? 'text-[#004ac6]'
                      : 'text-[#434655] hover:text-[#004ac6]'
                    : on
                      ? 'text-white'
                      : 'text-[#cbd5e1] hover:text-white',
                )}
              >
                {t(link.key, link.fallback)}
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute right-2.5 -bottom-0.5 left-2.5 h-0.5 2xl:right-3.5 2xl:left-3.5 origin-left rounded-full transition-transform duration-300',
                    solid ? 'bg-[#004ac6]' : 'bg-[#4edea3]',
                    on ? 'scale-x-100' : 'scale-x-0',
                  )}
                />
              </a>
            )
          })}
        </nav>

        <div className="hidden shrink-0 items-center gap-2 md:flex">
          <LanguageSwitcher tone={solid ? 'light' : 'dark'} />
          <Link
            to="/login"
            className={cn(
              'px-3 py-2.5 text-[15px] font-semibold whitespace-nowrap transition-colors',
              solid ? 'text-[#434655] hover:text-[#004ac6]' : 'text-white hover:text-[#cbd5e1]',
            )}
          >
            {t('auth.login', 'Log in')}
          </Link>
          <Link
            to="/apply"
            className="inline-flex h-11 items-center rounded-[10px] bg-[#004ac6] px-5 text-[15px] font-semibold whitespace-nowrap text-white shadow-[0_8px_20px_rgba(0,74,198,0.3)] transition-all hover:-translate-y-px hover:bg-[#2563eb]"
          >
            {t('public.applyNow', 'Apply now')}
          </Link>
        </div>

        <Tooltip content={open ? t('common.close', 'Close') : t('nav.menu', 'Menu')} align="end">
          <button
            type="button"
            className={cn('rounded-lg p-2 xl:hidden', solid ? 'text-[#434655]' : 'text-white')}
            aria-label={open ? t('common.close', 'Close') : t('nav.menu', 'Menu')}
            aria-expanded={open}
            onClick={() => setOpen((current) => !current)}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </Tooltip>
      </div>

      {open ? (
        <div className="landing-rise border-t border-[#e5eeff] bg-white shadow-lg xl:hidden">
          <nav aria-label={t('nav.main', 'Main')} className="mx-auto flex max-w-[1200px] flex-col gap-1 px-5 py-4">
            {LINKS.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                onClick={() => setOpen(false)}
                className={cn(
                  'rounded-lg px-3 py-3 text-[16px] font-medium',
                  active === link.id ? 'bg-[#eff4ff] text-[#004ac6]' : 'text-[#434655]',
                )}
              >
                {t(link.key, link.fallback)}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2.5 border-t border-[#e5eeff] pt-4">
              <LanguageSwitcher tone="light" className="justify-center" />
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-[10px] border border-[#dbe1ff] text-[15px] font-semibold text-[#0b1c30]"
              >
                {t('auth.login', 'Log in')}
              </Link>
              <Link
                to="/apply"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-[10px] bg-[#004ac6] px-5 text-[15px] font-semibold text-white"
              >
                {t('public.applyNow', 'Apply now')}
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  )
}
