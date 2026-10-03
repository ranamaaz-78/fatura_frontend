import { Check, ChevronLeft, MessageCircle } from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'
import { t } from '../i18n'
import { supportEmail, supportWhatsappUrl } from '../lib/support'
import { Logo } from '../components/brand/Logo'
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher'

const ASIDE_BACKGROUND = {
  backgroundImage:
    'radial-gradient(520px 420px at 20% 18%, rgba(37,99,235,0.35), rgba(11,28,48,0) 70%), ' +
    'radial-gradient(420px 320px at 90% 95%, rgba(78,222,163,0.16), rgba(11,28,48,0) 70%)',
  backgroundColor: '#0b1c30',
}

const PROMISES = [
  t('authLayout.invoices_and_quotes_in_seconds', 'Invoices and quotes in seconds'),
  t('authLayout.stock_that_updates_itself_as_you_sell', 'Stock that updates itself as you sell'),
  t('authLayout.one_account_for_your_computer_and_your', 'One account for your computer and your phone'),
]

export function AuthLayout() {
  const whatsappUrl = supportWhatsappUrl()

  return (
    <div className="flex min-h-screen flex-col bg-[#f8f9ff] text-[#0b1c30] lg:flex-row">
      <aside
        className="flex flex-col px-6 py-10 text-white sm:px-14 lg:w-[460px] lg:shrink-0 xl:w-[500px]"
        style={ASIDE_BACKGROUND}
      >
        <Link to="/" className="inline-flex" aria-label={t('app.name', 'YK Digital Solutions')}>
          <Logo on="dark" className="h-14" />
        </Link>

        <h2 className="mt-12 text-[32px] leading-[1.12] font-extrabold tracking-[-0.03em] sm:text-[40px] lg:mt-16">
          {t('auth.asideTitle', 'Run your shop from one screen.')}
        </h2>
        <p className="mt-4 text-base leading-relaxed text-[#cbd5e1]">
          {t(
            'auth.asideBody',
            'Invoices, stock and barcodes in one place, at the counter and in your pocket.',
          )}
        </p>

        <div className="mt-10 flex flex-col gap-3.5">
          {PROMISES.map((promise) => (
            <span key={promise} className="inline-flex items-center gap-3 text-[15px] text-[#e2e8f0]">
              <Check className="h-[18px] w-[18px] shrink-0 text-[#4edea3]" strokeWidth={2.4} />
              {promise}
            </span>
          ))}
        </div>

        <div className="mt-auto rounded-[20px] border border-white/12 bg-white/6 p-5.5">
          <span className="text-xs font-bold uppercase tracking-[0.08em] text-[#4edea3]">
            {t('auth.needHelp', 'Need a hand?')}
          </span>
          <p className="mt-2.5 text-[13px] leading-relaxed text-[#cbd5e1]">
            {t('auth.needHelpBody', 'If you cannot get in, our team can sort it out on the spot.')}
          </p>
          <div className="mt-3.5 flex flex-col gap-2 text-sm font-semibold">
            {whatsappUrl ? (
              <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2.5">
                <MessageCircle className="h-[18px] w-[18px] text-[#4edea3]" />
                {t('auth.contactWhatsapp', 'Message us on WhatsApp')}
              </a>
            ) : null}
            {supportEmail ? (
              <a href={`mailto:${supportEmail}`} className="text-[#cbd5e1] hover:text-white">
                {supportEmail}
              </a>
            ) : null}
          </div>
        </div>
      </aside>

      <main className="flex flex-1 flex-col px-5 py-10 sm:px-10">
        <div className="flex items-center justify-end gap-5">
          <LanguageSwitcher tone="light" />
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#434655] hover:text-[#004ac6]">
            <ChevronLeft className="h-4 w-4" />
            {t('public.backHome', 'Back to home')}
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-10">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
