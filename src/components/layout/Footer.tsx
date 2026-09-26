import { ScanLine } from 'lucide-react'
import { Link } from 'react-router-dom'
import { t } from '../../i18n'

const COLUMNS = [
  {
    heading: { key: 'footer.product', fallback: 'Product' },
    links: [
      { to: '/features', key: 'nav.features', fallback: 'Features' },
      { to: '/pricing', key: 'nav.pricing', fallback: 'Pricing' },
      { to: '/apply', key: 'public.applyNow', fallback: 'Apply now' },
    ],
  },
  {
    heading: { key: 'footer.company', fallback: 'Company' },
    links: [
      { to: '/about', key: 'nav.about', fallback: 'About' },
      { to: '/contact', key: 'nav.contact', fallback: 'Contact' },
    ],
  },
  {
    heading: { key: 'footer.legal', fallback: 'Legal' },
    links: [
      { to: '/terms', key: 'nav.terms', fallback: 'Terms' },
      { to: '/privacy', key: 'nav.privacy', fallback: 'Privacy' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="bg-[#0b1c30] px-5 pt-16 pb-10 text-[#cbd5e1]">
      <div className="mx-auto max-w-[1200px]">
        <div className="flex flex-col justify-between gap-12 sm:flex-row">
          <div className="max-w-[340px]">
            <span className="flex items-center gap-2.5">
              <span className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-[#004ac6] text-white">
                <ScanLine className="h-[17px] w-[17px]" />
              </span>
              <span className="text-[19px] font-bold text-white">{t('app.name', 'Fatura')}</span>
            </span>
            <p className="mt-4 text-sm leading-relaxed text-[#94a3b8]">
              {t(
                'footer.tagline',
                'Invoicing, stock and barcodes for small businesses, on the web and in your pocket.',
              )}
            </p>
          </div>

          <div className="flex gap-12 sm:gap-20">
            {COLUMNS.map((column) => (
              <div key={column.heading.fallback} className="flex flex-col gap-3 text-sm">
                <span className="text-xs font-bold uppercase tracking-[0.08em] text-white">
                  {t(column.heading.key, column.heading.fallback)}
                </span>
                {column.links.map((link) => (
                  <Link key={link.to} to={link.to} className="text-[#cbd5e1] transition-colors hover:text-white">
                    {t(link.key, link.fallback)}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/8 pt-6 text-[13px] text-[#94a3b8] sm:flex-row sm:justify-between">
          <span>
            {t('footer.rights', '© 2026 Fatura. All rights reserved.')}
          </span>
          <Link to="/login" className="text-[#cbd5e1] transition-colors hover:text-white">
            {t('footer.login', 'Log in to your account')}
          </Link>
        </div>
      </div>
    </footer>
  )
}
