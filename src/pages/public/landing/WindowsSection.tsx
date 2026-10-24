import {
  Clock,
  Download,
  FileText,
  Keyboard,
  LayoutDashboard,
  MonitorSmartphone,
  Package,
  PanelsTopLeft,
  Receipt,
  ScanLine,
  Search,
  Settings,
  ShieldAlert,
  Truck,
  Users,
} from 'lucide-react'
import { t } from '../../../i18n'
import { cn } from '../../../lib/cn'
import { desktopDownloadUrl, formatMegabytes } from '../../../services/desktopApp'
import { Reveal } from './hooks'
import { useDesktopRelease } from './useDesktopRelease'

const POINTS = [
  {
    icon: PanelsTopLeft,
    title: t('windowsApp.pointWindowTitle', 'Its own window'),
    body: t('windowsApp.pointWindowBody', 'Opens straight at your login, on the desktop and in the Start menu. No browser tabs to lose.'),
  },
  {
    icon: Keyboard,
    title: t('windowsApp.pointKeysTitle', 'Made for the counter'),
    body: t('windowsApp.pointKeysBody', 'Ctrl+K jumps anywhere, F2 starts an invoice, and the scanner bar is ready the moment you open a sale.'),
  },
  {
    icon: MonitorSmartphone,
    title: t('windowsApp.pointSameTitle', 'Same account, same data'),
    body: t('windowsApp.pointSameBody', 'Everything you do in the app is on the website too, and the other way round.'),
  },
]

/** The four-pane Windows mark, drawn here (lucide has no brand icons). */
function WindowsMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className} fill="currentColor">
      <rect x="1" y="1" width="8.4" height="8.4" rx="1" />
      <rect x="10.6" y="1" width="8.4" height="8.4" rx="1" />
      <rect x="1" y="10.6" width="8.4" height="8.4" rx="1" />
      <rect x="10.6" y="10.6" width="8.4" height="8.4" rx="1" />
    </svg>
  )
}

/**
 * "Download for Windows": the installer the platform admin uploaded, or "coming soon" before there is one. A light
 * section on purpose, so it stands apart from the dark pricing that follows it.
 */
export function WindowsSection() {
  const release = useDesktopRelease()
  const current = release.data ?? null

  return (
    <section id="windows" className="relative scroll-mt-20 overflow-hidden border-y border-[#dbe1ff] bg-[#eff4ff] px-5 pt-14 pb-16 sm:pt-20 sm:pb-20">
      <span aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-[#2563eb]/14 blur-[110px]" />

      <div className="relative mx-auto max-w-[1080px]">
        <Reveal className="mx-auto max-w-[720px] text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#c3d4ff] bg-white px-3.5 py-1.5 text-[13px] font-bold tracking-[0.08em] text-[#004ac6] uppercase shadow-[0_4px_14px_rgba(0,74,198,0.08)]">
            <WindowsMark className="h-3.5 w-3.5" />
            {t('windowsApp.eyebrow', 'Windows app')}
          </span>
          <h2 className="mt-5 text-[28px] leading-[1.1] font-extrabold tracking-[-0.035em] text-[#0b1c30] sm:text-[40px]">
            {t('windowsApp.title', 'Your shop, on your computer’s desktop.')}
          </h2>
          <p className="mx-auto mt-4 max-w-[600px] text-base leading-relaxed text-[#434655] sm:text-[17px]">
            {t('windowsApp.body', 'Install YK Digital Solutions on Windows and work from its own window, with a layout built for the counter and the keyboard.')}
          </p>

          <div className="mt-8 flex flex-col items-center">
            {release.isPending ? (
              <span className="block h-[58px] w-[280px] animate-pulse rounded-2xl bg-white" />
            ) : current ? (
              <>
                <a
                  href={desktopDownloadUrl()}
                  download={current.file_name}
                  className="group inline-flex h-[58px] items-center gap-3.5 rounded-2xl bg-[#0b1c30] pr-7 pl-5 text-left text-white shadow-[0_18px_40px_-12px_rgba(11,28,48,0.55)] transition-all hover:-translate-y-0.5 hover:bg-[#13294a]"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2563eb]">
                    <WindowsMark className="h-[18px] w-[18px]" />
                  </span>
                  <span className="flex flex-col leading-tight">
                    <span className="text-[17px] font-bold">{t('windowsApp.download', 'Download for Windows')}</span>
                    <span className="text-[12px] font-medium text-[#94a3b8]">
                      v{current.version} · {formatMegabytes(current.size_bytes)}
                    </span>
                  </span>
                  <Download className="ml-2 h-5 w-5 text-[#4edea3] transition-transform group-hover:translate-y-0.5" />
                </a>
                <p className="mt-3 text-[13px] text-[#64748b]">{t('windowsApp.requirements', 'Windows 10 or 11, 64-bit')}</p>
                <p className="mt-1.5 inline-flex max-w-[520px] items-start gap-1.5 text-[12px] leading-relaxed text-[#64748b]">
                  <ShieldAlert className="mt-px h-3.5 w-3.5 shrink-0 text-[#b45309]" />
                  {t('windowsApp.smartScreen', 'If Windows shows a blue warning the first time, click “More info”, then “Run anyway”.')}
                </p>
              </>
            ) : (
              <span
                aria-disabled="true"
                className="inline-flex h-[58px] cursor-not-allowed items-center gap-3 rounded-2xl border border-[#c3d4ff] bg-white px-6 text-[15px] font-semibold text-[#0b1c30]"
              >
                <Clock className="h-5 w-5 text-[#004ac6]" />
                {t('windowsApp.comingSoon', 'Coming soon for Windows')}
              </span>
            )}
          </div>
        </Reveal>

        <Reveal delay={120} className="mx-auto mt-12 max-w-[940px]">
          <AppWindow />
        </Reveal>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {POINTS.map((point, index) => {
            const Icon = point.icon
            return (
              <Reveal key={point.title} delay={index * 90}>
                <div className="h-full rounded-3xl border border-[#dbe1ff] bg-white p-6 shadow-[0_12px_30px_rgba(2,6,23,0.05)]">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#eff4ff] text-[#004ac6]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-[17px] font-bold text-[#0b1c30]">{point.title}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-[#434655]">{point.body}</p>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/** Sample names in the drawing: a made-up shop, not anyone's data. */
const SAMPLE_COMPANY = 'Tienda Lumen SL'
const SAMPLE_PERSON = 'Ana'

const RAIL = [LayoutDashboard, ScanLine, Receipt, Truck, FileText, Users, Package, Settings]

const ROWS = [
  { color: '#2563eb', number: 'F-202610/0042', client: 'Ana Martín', amount: '€282.66', paid: true },
  { color: '#14b8a6', number: 'A-202610/0043', client: 'Javier López', amount: '€101.70', paid: false },
  { color: '#8b5cf6', number: 'P-202610/0044', client: 'Marta Sánchez', amount: '€148.79', paid: true },
]

/** A drawing of the Windows app's dashboard (dark window frame, light screen), in plain markup. Sample figures only. */
function AppWindow() {
  return (
    <div aria-hidden="true" className="relative">
      <span className="pointer-events-none absolute inset-x-10 -bottom-6 h-16 rounded-[50%] bg-[#0b1c30]/25 blur-2xl" />
      <div className="relative overflow-hidden rounded-[20px] border border-[#0b1c30]/10 bg-[#0f172a] shadow-[0_50px_100px_-40px_rgba(11,28,48,0.6)]">
        {/* Title bar */}
        <div className="flex h-9 items-center gap-3 border-b border-white/8 px-3.5">
          <span className="flex gap-1 text-white/40">
            <span className="text-[11px]">‹</span>
            <span className="text-[11px]">›</span>
          </span>
          <span className="hidden text-[10px] text-white/45 sm:block">
            {t('nav.group.main', 'Main')} / <span className="font-semibold text-white/85">{t('nav.dashboard', 'Dashboard')}</span>
          </span>
          <span className="mx-auto flex h-5 w-[38%] items-center gap-1.5 rounded-md border border-white/10 bg-white/6 px-2 text-[9px] text-white/40">
            <Search className="h-2.5 w-2.5" />
            <span className="truncate">{t('desk.searchOrJump', 'Search or jump to…')}</span>
            <span className="ml-auto rounded border border-white/15 px-1 text-[8px]">Ctrl K</span>
          </span>
          <span className="flex gap-3.5 text-[10px] text-white/45">
            <span>—</span>
            <span>▢</span>
            <span>✕</span>
          </span>
        </div>

        <div className="flex">
          {/* Icon rail */}
          <div className="flex w-12 flex-col items-center gap-2.5 border-r border-white/8 py-3">
            {RAIL.map((Icon, index) => (
              <span
                key={index}
                className={cn('flex h-7 w-7 items-center justify-center rounded-lg', index === 0 ? 'bg-[#2563eb] text-white shadow-[0_0_16px_rgba(37,99,235,0.7)]' : 'text-white/45')}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
            ))}
          </div>

          {/* Screen */}
          <div className="min-w-0 flex-1 space-y-3 bg-[#f4f7ff] bg-[radial-gradient(500px_220px_at_8%_0%,rgba(37,99,235,0.12),transparent)] p-3.5 sm:p-4">
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-12 rounded-2xl bg-gradient-to-br from-[#1d4ed8] to-[#0b2a6b] p-4 text-white sm:col-span-7">
                <p className="text-[9px] font-semibold text-white/70">{SAMPLE_COMPANY}</p>
                <p className="text-[12px] font-extrabold">{`${t('dashboard.greeting', 'Welcome back')}, ${SAMPLE_PERSON}`}</p>
                <p className="mt-2.5 text-[8px] font-bold tracking-[0.14em] text-white/65 uppercase">{t('dashboard.salesThisMonth', 'Sales this month')}</p>
                <p className="text-[24px] leading-none font-extrabold tracking-tight">€18,493.40</p>
                <svg viewBox="0 0 200 40" preserveAspectRatio="none" className="mt-2 h-8 w-full">
                  <path d="M0 32 L20 26 L40 29 L60 20 L80 24 L100 15 L120 19 L140 10 L160 14 L180 6 L200 9 L200 40 L0 40 Z" fill="rgba(255,255,255,0.18)" />
                  <path d="M0 32 L20 26 L40 29 L60 20 L80 24 L100 15 L120 19 L140 10 L160 14 L180 6 L200 9" fill="none" stroke="white" strokeWidth="1.5" />
                </svg>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[`${t('desk.newInvoice', 'New invoice')}  F2`, `${t('desk.newDeliveryNote', 'New delivery note')}  F3`].map((label) => (
                    <span key={label} className="rounded-md bg-white/15 px-2 py-1 text-[8px] font-semibold ring-1 ring-white/20">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="col-span-12 grid grid-cols-2 gap-3 sm:col-span-5">
                {[
                  [t('dashboard.tax', 'Tax'), '€3,209', '#64748b'],
                  [t('dashboard.profit', 'Profit'), '€6,877', '#059669'],
                  [t('reports.paid', 'Paid'), '€12,044', '#2563eb'],
                  [t('dashboard.lowStock', 'Low stock'), '4', '#d97706'],
                ].map(([label, value, color]) => (
                  <div key={label} className="rounded-xl border border-[#e2e8f0] bg-white p-2.5 shadow-[0_6px_16px_-10px_rgba(15,23,42,0.25)]">
                    <p className="text-[8px] font-bold tracking-[0.12em] text-[#64748b] uppercase">{label}</p>
                    <p className="mt-1 text-[14px] font-extrabold" style={{ color }}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-[#e2e8f0] bg-white p-2.5">
              <p className="mb-1.5 text-[8px] font-bold tracking-[0.12em] text-[#64748b] uppercase">{t('dashboard.recent', 'Latest documents')}</p>
              {ROWS.map((row) => (
                <div key={row.number} className="flex items-center gap-2 border-t border-[#f1f5f9] py-1.5 first:border-t-0">
                  <span className="h-5 w-5 shrink-0 rounded-md" style={{ background: `${row.color}22`, boxShadow: `inset 0 0 0 1px ${row.color}66` }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[9px] font-bold text-[#0b1c30]">{row.client}</span>
                    <span className="block truncate text-[8px] text-[#64748b]">{row.number}</span>
                  </span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[8px] font-semibold ${row.paid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}
                  >
                    {row.paid ? t('reports.paid', 'Paid') : t('reports.pending', 'Pending')}
                  </span>
                  <span className="w-12 text-right text-[9px] font-extrabold text-[#0b1c30]">{row.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div className="flex h-6 items-center gap-2 border-t border-white/8 px-3.5 text-[8px] text-white/50">
          <span>{`${SAMPLE_COMPANY} · ${t('nav.roleOwner', 'Owner')}`}</span>
          <span className="ml-auto inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#4edea3]" />
            {t('desk.online', 'Connected')}
          </span>
        </div>
      </div>
    </div>
  )
}
