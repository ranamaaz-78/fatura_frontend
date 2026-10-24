import { Check, FileCheck2, FileText, MessageCircle, Receipt, Truck, type LucideIcon } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import { Logo } from '../../components/brand/Logo'
import { LanguageSwitcher } from '../../components/ui/LanguageSwitcher'
import { t } from '../../i18n'
import { isDesktop } from '../../lib/desktop'
import { supportEmail, supportWhatsappUrl } from '../../lib/support'
import '../desktop.css'

const PROMISES = [
  t('authLayout.invoices_and_quotes_in_seconds', 'Invoices and quotes in seconds'),
  t('authLayout.stock_that_updates_itself_as_you_sell', 'Stock that updates itself as you sell'),
  t('authLayout.one_account_for_your_computer_and_your', 'One account for your computer and your phone'),
]

type FloatingDoc = { icon: LucideIcon; title: string; number: string; amount: string; tone: string; className: string; tilt: string; delay: string }

/** The four documents the app makes, drifting behind the welcome text. Sample numbers only: nothing is loaded. */
const DOCS: FloatingDoc[] = [
  { icon: Receipt, title: t('sales.typeFactura', 'Invoice'), number: 'F-2026/0185', amount: '1.248,00 €', tone: '#60a5fa', className: 'top-[13%] right-[150px]', tilt: '-6deg', delay: '0s' },
  { icon: FileCheck2, title: t('sales.typeProforma', 'Proforma'), number: 'PF-2026/0019', amount: '640,00 €', tone: '#fbbf24', className: 'top-[31%] right-[10px]', tilt: '7deg', delay: '-5.6s' },
  { icon: FileText, title: t('sales.typeQuotation', 'Quotation'), number: 'P-2026/0042', amount: '3.910,50 €', tone: '#a78bfa', className: 'top-[50%] right-[170px]', tilt: '4deg', delay: '-2.2s' },
  { icon: Truck, title: t('sales.typeAlbaran', 'Delivery note'), number: 'A-2026/0311', amount: '86 uds', tone: '#2dd4bf', className: 'top-[68%] right-[24px]', tilt: '-4deg', delay: '-4.1s' },
]

/**
 * The sign-in screens of the Windows app: a full-window brand scene with the form floating on a card. The forms are the
 * website's own (Login, ForgotPassword, ResetPassword, SetPassword), so signing in works exactly the same.
 */
export function DesktopAuthLayout() {
  const whatsappUrl = supportWhatsappUrl()

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-[#050b18] text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="desk-aurora absolute -top-[30%] -left-[10%] h-[80%] w-[70%] rounded-full bg-[radial-gradient(closest-side,rgba(37,99,235,0.55),transparent)] blur-3xl" />
        <div className="desk-aurora absolute -right-[15%] -bottom-[35%] h-[85%] w-[65%] rounded-full bg-[radial-gradient(closest-side,rgba(20,184,166,0.32),transparent)] blur-3xl [animation-delay:-6s]" />
        <div className="desk-aurora absolute top-[20%] left-[40%] h-[50%] w-[40%] rounded-full bg-[radial-gradient(closest-side,rgba(139,92,246,0.28),transparent)] blur-3xl [animation-delay:-11s]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      </div>

      {/* The strip the window is dragged by; Windows draws its buttons over the right end. */}
      <div className="desk-drag absolute inset-x-0 top-0 z-20 flex h-[var(--desk-titlebar)] items-center justify-end">
        <div className={isDesktop ? 'desk-nodrag pr-[148px]' : 'desk-nodrag pr-4'}>
          <LanguageSwitcher tone="dark" />
        </div>
      </div>

      <section className="relative z-10 flex min-w-0 flex-1 flex-col px-14 pt-16 pb-10">
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden xl:block">
          {DOCS.map((doc) => (
            <DocCard key={doc.number} doc={doc} />
          ))}
        </div>

        <Logo on="dark" className="relative h-12 self-start" />

        <div className="relative mt-auto max-w-[400px]">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-[#93c5fd] uppercase backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[#4edea3]" />
            {t('desk.forWindows', 'For Windows')}
          </p>
          <h1 className="mt-5 text-[42px] leading-[1.05] font-extrabold tracking-[-0.04em]">
            {t('auth.asideTitle', 'Run your shop from one screen.')}
          </h1>
          <p className="mt-4 max-w-[440px] text-[16px] leading-relaxed text-[#cbd5e1]">
            {t('auth.asideBody', 'Invoices, stock and barcodes in one place, at the counter and in your pocket.')}
          </p>
          <ul className="mt-7 space-y-3">
            {PROMISES.map((promise) => (
              <li key={promise} className="flex items-center gap-3 text-[14px] text-[#e2e8f0]">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#4edea3]/15 ring-1 ring-[#4edea3]/30">
                  <Check className="h-3.5 w-3.5 text-[#4edea3]" strokeWidth={2.6} />
                </span>
                {promise}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mt-auto flex flex-wrap items-center gap-x-6 gap-y-2 pt-10 text-[13px] text-[#94a3b8]">
          <span className="font-semibold text-[#4edea3]">{t('auth.needHelp', 'Need a hand?')}</span>
          {whatsappUrl ? (
            <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-semibold text-white hover:text-[#4edea3]">
              <MessageCircle className="h-4 w-4" />
              {t('auth.contactWhatsapp', 'Message us on WhatsApp')}
            </a>
          ) : null}
          {supportEmail ? (
            <a href={`mailto:${supportEmail}`} className="hover:text-white">
              {supportEmail}
            </a>
          ) : null}
        </div>
      </section>

      <section className="relative z-10 flex w-[460px] shrink-0 items-center justify-center px-10 py-14">
        <div className="desk-rise w-full rounded-[28px] bg-white p-9 text-[#0b1c30] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.08)]">
          <Outlet />
        </div>
      </section>
    </div>
  )
}

function DocCard({ doc }: { doc: FloatingDoc }) {
  const Icon = doc.icon
  return (
    <div
      className={`desk-float absolute w-[220px] rounded-2xl border border-white/12 bg-white/[0.07] p-4 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.8)] backdrop-blur-md ${doc.className}`}
      style={{ ['--tilt' as string]: doc.tilt, animationDelay: doc.delay }}
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${doc.tone}26`, color: doc.tone }}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[12px] font-bold text-white">{doc.title}</p>
          <p className="text-[10px] text-[#94a3b8]">{doc.number}</p>
        </div>
      </div>
      <div className="mt-3.5 space-y-1.5">
        <span className="block h-1.5 w-full rounded-full bg-white/10" />
        <span className="block h-1.5 w-4/5 rounded-full bg-white/10" />
        <span className="block h-1.5 w-3/5 rounded-full bg-white/10" />
      </div>
      <p className="desk-num mt-3.5 text-right text-[15px] font-extrabold" style={{ color: doc.tone }}>
        {doc.amount}
      </p>
    </div>
  )
}
