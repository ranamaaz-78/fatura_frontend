import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Check,
  LayoutDashboard,
  Lock,
  Package,
  Plus,
  Receipt,
  Users,
} from 'lucide-react'
import markImage from '../../assets/brand/mark.png'
import { t } from '../../i18n'
import { formatCurrency } from '../../lib/format'

/**
 * Decorative product shots. Nothing here is real data.
 */

const INVOICES = [
  { number: 'F-2026/0184', customer: 'Taller Rivas', total: formatCurrency(245.6, 'EUR'), paid: true },
  { number: 'F-2026/0183', customer: 'Luna Textiles', total: formatCurrency(318.2, 'EUR'), paid: false },
  { number: 'F-2026/0182', customer: 'Casa Mora', total: formatCurrency(92, 'EUR'), paid: true },
]

const LOW_STOCK = [
  { name: t('featureBento.usb_c_charger_65_w', 'USB-C charger 65 W'), left: 2, of: 20 },
  { name: t('mockups.hdmi_cable', 'HDMI cable 2 m'), left: 5, of: 30 },
  { name: t('mockups.label_sheet', 'Label sheet A4'), left: 7, of: 25 },
]

const NAV = [
  { icon: LayoutDashboard, label: t('nav.dashboard', 'Dashboard'), active: true },
  { icon: Receipt, label: t('nav.invoices', 'Invoices'), active: false },
  { icon: Package, label: t('products.kpiProducts', 'Products'), active: false },
  { icon: Users, label: t('mockups.customers', 'Customers'), active: false },
  { icon: BarChart3, label: t('nav.reports', 'Reports'), active: false },
]

const WEEK = [
  { day: 'Mon', value: 38 },
  { day: 'Tue', value: 52 },
  { day: 'Wed', value: 44 },
  { day: 'Thu', value: 68 },
  { day: 'Fri', value: 61 },
  { day: 'Sat', value: 92 },
  { day: 'Sun', value: 74 },
]

function Kpi({ label, value, delta, tone }: { label: string; value: string; delta: string; tone: 'up' | 'down' }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <span className="block text-[9px] font-semibold tracking-[0.06em] text-[#64748b] uppercase">{label}</span>
      <span className="mt-1 block text-[16px] leading-none font-bold text-slate-900">{value}</span>
      <span
        className={`mt-1.5 inline-flex items-center gap-0.5 text-[10px] font-semibold ${
          tone === 'up' ? 'text-emerald-600' : 'text-amber-600'
        }`}
      >
        {tone === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
        {delta}
      </span>
    </div>
  )
}

/** A weekly sales line with soft gridlines, drawn to fit the card it sits in. */
function SalesChart() {
  const width = 440
  const height = 132
  const left = 8
  const top = 34
  const bottom = 22
  const max = 100
  const step = (width - left * 2) / (WEEK.length - 1)
  const points = WEEK.map((point, index) => ({
    x: left + index * step,
    y: top + (height - top - bottom) * (1 - point.value / max),
    ...point,
  }))
  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ')
  const area = `${line} L${points[points.length - 1].x} ${height - bottom} L${points[0].x} ${height - bottom} Z`
  const peak = points.reduce((best, point) => (point.value > best.value ? point : best))

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="block w-full" aria-hidden="true">
      <defs>
        <linearGradient id="hero-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#004ac6" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#004ac6" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2].map((row) => {
        const y = top + ((height - top - bottom) / 2) * row
        return <line key={row} x1={left} x2={width - left} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="3 4" />
      })}
      <path d={area} fill="url(#hero-area)" />
      <path d={line} fill="none" stroke="#004ac6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((point) => (
        <text key={point.day} x={point.x} y={height - 6} textAnchor="middle" fontSize="9" fill="#94a3b8">
          {point.day}
        </text>
      ))}
      <circle cx={peak.x} cy={peak.y} r="5" fill="#004ac6" stroke="#ffffff" strokeWidth="2.5" />
      <g transform={`translate(${peak.x - 34} ${peak.y - 28})`}>
        <rect width="68" height="20" rx="6" fill="#0b1c30" />
        <text x="34" y="13.5" textAnchor="middle" fontSize="10" fontWeight="700" fill="#ffffff">
          {formatCurrency(1842.5, 'EUR')}
        </text>
      </g>
    </svg>
  )
}

export function HeroMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[620px] pt-4 pb-10 xl:mr-0 xl:ml-auto">
      {/* Browser window */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_40px_90px_rgba(2,6,23,0.5)] ring-1 ring-white/10">
        <div className="flex h-9 shrink-0 items-center gap-1.5 border-b border-slate-200 bg-slate-100 px-3.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          <span className="ml-4 flex h-5 max-w-[260px] flex-1 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 text-[10px] text-[#64748b]">
            <Lock className="h-2.5 w-2.5" />
            {t('mockups.app_ykdigitalsolutions_com_dashboard', 'app.ykdigitalsolutions.com/dashboard')}
          </span>
        </div>

        <div className="flex">
          <div className="flex w-11 shrink-0 flex-col gap-1 bg-[#0f172a] px-1.5 py-3 sm:w-[132px] sm:px-2.5">
            <div className="mb-3 flex items-center justify-center sm:justify-start">
              <img src={markImage} alt="" width={192} height={160} className="h-6 w-auto" draggable={false} />
            </div>
            {NAV.map((item) => (
              <span
                key={item.label}
                className={`flex items-center justify-center gap-2 rounded-lg px-2 py-1.5 text-[11px] font-medium sm:justify-start ${
                  item.active ? 'bg-[#004ac6] text-white' : 'text-slate-400'
                }`}
              >
                <item.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">{item.label}</span>
              </span>
            ))}
            <span className="mt-auto hidden items-center gap-2 rounded-lg bg-white/6 px-2 py-2 sm:flex">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#004ac6] text-[8px] font-bold text-white">
                {t('mockups.am', 'AM')}
              </span>
              <span className="text-[10px] font-medium text-slate-300">{t('mockups.ana_mora', 'Ana Mora')}</span>
            </span>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3 bg-slate-50 p-3.5 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="block truncate text-[13px] font-bold text-slate-900">{t('mockups.good_morning_ana', 'Good morning, Ana')}</span>
                <span className="block text-[10px] text-[#64748b]">{t('mockups.here_is_how_the_shop_is_doing_today', 'Here is how the shop is doing today')}</span>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#004ac6] px-2.5 py-1.5 text-[10px] font-semibold text-white">
                <Plus className="h-3 w-3" /> {t('dashboard.newInvoice', 'New invoice')}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Kpi label={t('mockups.sales_today', 'Sales today')} value={formatCurrency(1842, 'EUR', undefined, 0)} delta={t('mockups.12_vs_last_week', '12% vs last week')} tone="up" />
              <Kpi label={t('nav.invoices', 'Invoices')} value="38" delta={t('mockups.6_this_morning', '6 this morning')} tone="up" />
              <Kpi label={t('dashboard.lowStock', 'Low stock')} value="12" delta={t('mockups.needs_a_reorder', 'Needs a reorder')} tone="down" />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-900">{t('public.reportWeek', 'Sales this week')}</span>
                <span className="rounded-full bg-emerald-50 px-2 py-px text-[9px] font-semibold text-emerald-700">+18%</span>
              </div>
              <SalesChart />
            </div>

            <div className="grid gap-3 sm:grid-cols-[1.35fr_1fr]">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <span className="block border-b border-slate-100 px-3 py-2 text-[11px] font-bold text-slate-900">
                  {t('mockups.recent_invoices', 'Recent invoices')}
                </span>
                {INVOICES.map((invoice) => (
                  <div
                    key={invoice.number}
                    className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-1.5 text-[10px] last:border-b-0"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-slate-900">{invoice.customer}</span>
                      <span className="block text-[9px] text-[#94a3b8]">{invoice.number}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-semibold text-slate-900">{invoice.total}</span>
                      <span
                        className={`inline-block rounded-full px-1.5 text-[9px] font-medium ${
                          invoice.paid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {invoice.paid ? t('status.PAID', 'Paid') : t('status.PENDING', 'Pending')}
                      </span>
                    </span>
                  </div>
                ))}
              </div>

              <div className="hidden rounded-xl border border-slate-200 bg-white sm:block">
                <span className="block border-b border-slate-100 px-3 py-2 text-[11px] font-bold text-slate-900">
                  {t('mockups.running_low', 'Running low')}
                </span>
                <div className="space-y-2.5 px-3 py-2.5">
                  {LOW_STOCK.map((item) => (
                    <div key={item.name}>
                      <div className="flex justify-between text-[10px]">
                        <span className="truncate text-slate-700">{item.name}</span>
                        <span className="font-semibold text-amber-700">{item.left} {t('sales.left', 'left')}</span>
                      </div>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-amber-400" style={{ width: `${(item.left / item.of) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating confirmation */}
      <div className="landing-float absolute bottom-0 left-4 hidden items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_18px_40px_rgba(2,6,23,0.35)] sm:flex xl:-left-10 xl:-bottom-1">
        <span className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-emerald-50 text-[#007d55]">
          <Check className="h-[18px] w-[18px]" strokeWidth={2.2} />
        </span>
        <span>
          <span className="block text-[13px] font-bold text-[#0b1c30]">{t('mockups.invoice_f_2026_0185_issued', 'Invoice F-2026/0185 issued')}</span>
          <span className="block text-xs text-[#434655]">{t('mockups.stock_updated_automatically', 'Stock updated automatically')}</span>
        </span>
      </div>

      {/* Floating stock alert */}
      <div className="landing-float-slow absolute top-0 right-4 hidden items-center gap-2.5 rounded-xl bg-white px-3.5 py-2.5 shadow-[0_18px_40px_rgba(2,6,23,0.3)] sm:flex xl:-right-3">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
          <AlertTriangle className="h-4 w-4" />
        </span>
        <span className="text-[12px] font-bold text-[#0b1c30]">{t('mockups.3_products_running_low', '3 products running low')}</span>
      </div>
    </div>
  )
}

export function MobileShowcase() {
  return (
    <div
      className="relative mx-auto h-[420px] w-full max-w-[520px] shrink-0 overflow-hidden rounded-[32px] border border-[#dbe1ff] bg-[#eff4ff] sm:h-[520px]"
      style={{
        backgroundImage:
          'radial-gradient(360px 300px at 50% 55%, rgba(37,99,235,0.18), rgba(248,249,255,0) 72%)',
      }}
    >
      <div className="absolute top-14 left-6 h-[330px] w-40 -rotate-[7deg] rounded-[32px] bg-slate-950 p-[7px] shadow-[0_24px_48px_rgba(11,28,48,0.25)] sm:top-20 sm:left-[72px] sm:h-[390px] sm:w-[190px]">
        <div className="flex h-full w-full flex-col overflow-hidden rounded-[26px] bg-slate-50">
          <div className="mt-4 flex h-10 items-center justify-center border-b border-slate-200 bg-white text-[11px] font-semibold">
            {t('nav.dashboard', 'Dashboard')}
          </div>
          <div className="grid grid-cols-2 gap-[7px] p-2.5">
            <span className="h-[52px] rounded-[10px] border border-slate-200 bg-white" />
            <span className="h-[52px] rounded-[10px] border border-slate-200 bg-white" />
            <span className="h-[52px] rounded-[10px] border border-slate-200 bg-white" />
            <span className="h-[52px] rounded-[10px] border border-slate-200 bg-white" />
          </div>
          <div className="mx-2.5 h-[90px] rounded-xl border border-slate-200 bg-white" />
        </div>
      </div>

      <div className="absolute top-8 right-5 h-[350px] w-[170px] rotate-[5deg] rounded-[34px] bg-slate-950 p-2 shadow-[0_30px_60px_rgba(11,28,48,0.35)] sm:top-[50px] sm:right-[70px] sm:h-[410px] sm:w-[200px]">
        <div className="flex h-full w-full flex-col items-center overflow-hidden rounded-[27px] bg-slate-900">
          <span className="mt-7 text-[11px] font-semibold text-[#cbd5e1]">{t('mockups.point_at_a_barcode', 'Point at a barcode')}</span>
          <div className="relative mt-12 h-[90px] w-[140px] rounded-[14px] border-2 border-[#4edea3] sm:mt-[70px]">
            <span className="absolute top-11 right-2.5 left-2.5 h-0.5 bg-[#4edea3]" />
          </div>
          <div className="mt-auto mb-3.5 w-[164px] rounded-[14px] bg-white px-3 py-2.5">
            <span className="block text-[10px] font-bold text-[#0b1c30]">{t('featureBento.usb_c_charger_65_w', 'USB-C charger 65 W')}</span>
            <span className="mt-0.5 block text-[9px] text-[#64748b]">8412345678905</span>
            <span className="mt-2 flex h-[26px] items-center justify-center rounded-lg bg-[#004ac6] text-[10px] font-semibold text-white">
              {t('mockups.add_to_invoice', 'Add to invoice')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
