import { ArrowUp, MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { t } from '../../i18n'
import { supportEmail, supportWhatsappUrl } from '../../lib/support'
import { Logo } from '../brand/Logo'

/** One page: every link points at a section of it. Terms and privacy open as a dialog. */
const COLUMNS = [
  {
    heading: { key: 'footer.product', fallback: 'Product' },
    links: [
      { href: '#features', key: 'nav.features', fallback: 'Features' },
      { href: '#documents', key: 'nav.documents', fallback: 'Documents' },
      { href: '#pricing', key: 'nav.pricing', fallback: 'Pricing' },
      { href: '#faq', key: 'nav.faq', fallback: 'FAQ' },
    ],
  },
  {
    heading: { key: 'footer.company', fallback: 'Company' },
    links: [
      { href: '#about', key: 'nav.about', fallback: 'About' },
      { href: '#contact', key: 'nav.contact', fallback: 'Contact' },
      { href: '/apply', key: 'public.applyNow', fallback: 'Apply now' },
    ],
  },
  {
    heading: { key: 'footer.legal', fallback: 'Legal' },
    links: [
      { href: '#terms', key: 'nav.terms', fallback: 'Terms' },
      { href: '#privacy', key: 'nav.privacy', fallback: 'Privacy' },
    ],
  },
]

export function Footer() {
  const whatsappUrl = supportWhatsappUrl()

  return (
    <footer className="bg-[#0b1c30] px-5 pt-16 pb-10 text-[#cbd5e1]">
      <div className="mx-auto max-w-[1200px]">
        <div className="flex flex-col justify-between gap-12 lg:flex-row">
          <div className="max-w-[360px]">
            <a href="#top" className="inline-flex" aria-label={t('app.name', 'YK Digital Solutions')}>
              <Logo on="dark" className="h-14" />
            </a>
            <p className="mt-4 text-sm leading-relaxed text-[#94a3b8]">
              {t(
                'footer.tagline',
                'Invoicing, stock and barcodes for small businesses, on the web and in your pocket.',
              )}
            </p>
            {whatsappUrl || supportEmail ? (
              <div className="mt-5 flex flex-col gap-2 text-sm">
                {supportEmail ? (
                  <a href={`mailto:${supportEmail}`} className="break-all text-[#cbd5e1] transition-colors hover:text-white">
                    {supportEmail}
                  </a>
                ) : null}
                {whatsappUrl ? (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-[#4edea3] transition-colors hover:text-white"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {t('public.chatWhatsapp', 'Chat on WhatsApp')}
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 sm:gap-20">
            {COLUMNS.map((column) => (
              <div key={column.heading.fallback} className="flex flex-col gap-3 text-sm">
                <span className="text-xs font-bold tracking-[0.08em] text-white uppercase">
                  {t(column.heading.key, column.heading.fallback)}
                </span>
                {column.links.map((link) =>
                  link.href.startsWith('/') ? (
                    <Link key={link.href} to={link.href} className="text-[#cbd5e1] transition-colors hover:text-white">
                      {t(link.key, link.fallback)}
                    </Link>
                  ) : (
                    <a key={link.href} href={link.href} className="text-[#cbd5e1] transition-colors hover:text-white">
                      {t(link.key, link.fallback)}
                    </a>
                  ),
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/8 pt-6 text-[13px] text-[#94a3b8] sm:flex-row sm:items-center sm:justify-between">
          <span>{t('footer.rights', '© 2026 YK Digital Solutions. All rights reserved.')}</span>
          <span className="flex items-center gap-6">
            <Link to="/login" className="text-[#cbd5e1] transition-colors hover:text-white">
              {t('footer.login', 'Log in to your account')}
            </Link>
            <a
              href="#top"
              className="inline-flex items-center gap-1.5 text-[#cbd5e1] transition-colors hover:text-white"
              aria-label={t('footer.top', 'Back to top')}
            >
              <ArrowUp className="h-4 w-4" />
              {t('footer.top', 'Back to top')}
            </a>
          </span>
        </div>
      </div>
    </footer>
  )
}
