import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'

const links = [
  { to: '/features', key: 'nav.features', fallback: 'Features' },
  { to: '/pricing', key: 'nav.pricing', fallback: 'Pricing' },
  { to: '/about', key: 'nav.about', fallback: 'About' },
  { to: '/contact', key: 'nav.contact', fallback: 'Contact' },
]

export function PublicNavbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="fixed top-0 inset-x-0 z-40 h-20 bg-white/90 backdrop-blur-xl border-b border-slate-100/80">
      <div className="h-20 max-w-[1280px] mx-auto px-6 sm:px-8 flex items-center justify-between gap-6">
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <span className="w-9 h-9 rounded-lg bg-[#004ac6] text-white font-mono text-sm font-bold inline-flex items-center justify-center">
            F
          </span>
          <span className="text-xl font-bold tracking-tight text-[#0b1c30]">{t('app.name', 'Fatura')}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  'text-[15px] font-medium text-[#434655] hover:text-[#004ac6] transition-colors',
                  isActive && 'text-[#004ac6] font-semibold',
                )
              }
            >
              {t(link.key, link.fallback)}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <Link to="/login" className="text-[15px] font-medium text-[#434655] hover:text-[#004ac6]">
            {t('auth.login', 'Log in')}
          </Link>
          <Link
            to="/apply"
            className="h-11 px-5 rounded-lg bg-[#004ac6] text-white text-sm font-semibold inline-flex items-center hover:bg-[#2563eb] transition-colors"
          >
            {t('public.applyCta', 'Apply for access')}
          </Link>
        </div>

        <button
          type="button"
          className="md:hidden p-2 rounded-lg text-slate-600"
          aria-label={open ? t('common.close', 'Close') : t('nav.menu', 'Menu')}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {open ? (
        <div className="md:hidden border-t border-slate-100 bg-white/98 shadow-lg">
          <div className="px-6 py-4 flex flex-col gap-3">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn('text-[15px] font-medium text-[#434655]', isActive && 'text-[#004ac6] font-semibold')
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
              className="h-11 px-5 rounded-lg bg-[#004ac6] text-white text-sm font-semibold inline-flex items-center justify-center"
            >
              {t('public.applyCta', 'Apply for access')}
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  )
}
