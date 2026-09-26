import { Menu, ScanLine, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'

/** The landing page scrolls between its own sections; every other page routes. */
const LANDING_LINKS = [
  { href: '#features', key: 'nav.features', fallback: 'Features' },
  { href: '#how', key: 'nav.howItWorks', fallback: 'How it works' },
  { href: '#mobile', key: 'nav.mobileApp', fallback: 'Mobile app' },
  { href: '#pricing', key: 'nav.pricing', fallback: 'Pricing' },
  { href: '#faq', key: 'nav.faq', fallback: 'FAQ' },
]

const PAGE_LINKS = [
  { to: '/features', key: 'nav.features', fallback: 'Features' },
  { to: '/pricing', key: 'nav.pricing', fallback: 'Pricing' },
  { to: '/about', key: 'nav.about', fallback: 'About' },
  { to: '/contact', key: 'nav.contact', fallback: 'Contact' },
]

export function PublicNavbar() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  // On the landing page the bar sits inside the dark hero instead of above it.
  const onHero = pathname === '/'

  return (
    <header
      className={cn(
        'z-40',
        onHero
          ? 'absolute inset-x-0 top-0'
          : 'fixed inset-x-0 top-0 border-b border-[#e5eeff] bg-white/90 backdrop-blur-xl',
      )}
    >
      <div
        className={cn(
          'mx-auto flex h-20 max-w-[1200px] items-center justify-between gap-6 px-5',
          onHero && 'border-b border-white/8',
        )}
      >
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#004ac6] text-white">
            <ScanLine className="h-[18px] w-[18px]" />
          </span>
          <span
            className={cn(
              'text-xl font-bold tracking-[-0.02em]',
              onHero ? 'text-white' : 'text-[#0b1c30]',
            )}
          >
            {t('app.name', 'Fatura')}
          </span>
        </Link>

        <nav className="hidden items-center gap-9 lg:flex">
          {onHero
            ? LANDING_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-[15px] font-medium text-[#cbd5e1] transition-colors hover:text-white"
                >
                  {t(link.key, link.fallback)}
                </a>
              ))
            : PAGE_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    cn(
                      'text-[15px] font-medium text-[#434655] transition-colors hover:text-[#004ac6]',
                      isActive && 'font-semibold text-[#004ac6]',
                    )
                  }
                >
                  {t(link.key, link.fallback)}
                </NavLink>
              ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            to="/login"
            className={cn(
              'px-4 py-2.5 text-[15px] font-semibold transition-colors',
              onHero ? 'text-white hover:text-[#cbd5e1]' : 'text-[#434655] hover:text-[#004ac6]',
            )}
          >
            {t('auth.login', 'Log in')}
          </Link>
          <Link
            to="/apply"
            className="inline-flex h-11 items-center rounded-[10px] bg-[#004ac6] px-5 text-[15px] font-semibold text-white transition-colors hover:bg-[#2563eb]"
          >
            {t('public.applyNow', 'Apply now')}
          </Link>
        </div>

        <button
          type="button"
          className={cn('rounded-lg p-2 md:hidden', onHero ? 'text-white' : 'text-[#434655]')}
          aria-label={open ? t('common.close', 'Close') : t('nav.menu', 'Menu')}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-[#e5eeff] bg-white shadow-lg md:hidden">
          <div className="flex flex-col gap-3 px-5 py-4">
            {onHero
              ? LANDING_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="text-[15px] font-medium text-[#434655]"
                  >
                    {t(link.key, link.fallback)}
                  </a>
                ))
              : PAGE_LINKS.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      cn('text-[15px] font-medium text-[#434655]', isActive && 'font-semibold text-[#004ac6]')
                    }
                  >
                    {t(link.key, link.fallback)}
                  </NavLink>
                ))}
            <Link to="/login" onClick={() => setOpen(false)} className="text-[15px] font-medium text-[#434655]">
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
        </div>
      ) : null}
    </header>
  )
}
