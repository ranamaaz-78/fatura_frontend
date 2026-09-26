import { Check } from 'lucide-react'

/**
 * Decorative product shots. Nothing here is real data; the phone and the toast
 * in the hero only appear once there is room for them to overlap the browser
 * frame the way the design intends.
 */

const INVOICES = [
  { number: 'F-2026/0184', customer: 'Rivas Workshop', total: '$245.60', status: 'Paid' },
  { number: 'F-2026/0183', customer: 'Luna Fabrics', total: '$318.20', status: 'Pending' },
]

const CART = [
  { name: 'HDMI cable 2 m', qty: 'x2', highlight: false },
  { name: 'USB-C charger', qty: 'x1', highlight: true },
  { name: 'Label sheet A4', qty: 'x3', highlight: false },
]

function Kpi({ label, value, tone }: { label: string; value: string; tone?: 'warn' }) {
  return (
    <div className="rounded-[10px] border border-slate-200 bg-white px-3 py-2.5">
      <span className="block text-[9px] font-semibold uppercase tracking-[0.06em] text-[#64748b]">{label}</span>
      <span
        className={`mt-1 block font-mono text-[15px] font-bold ${tone === 'warn' ? 'text-amber-700' : 'text-slate-900'}`}
      >
        {value}
      </span>
    </div>
  )
}

export function HeroMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[600px] xl:h-[520px] xl:max-w-none">
      {/* Browser window */}
      <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_40px_80px_rgba(2,6,23,0.45)] xl:absolute xl:top-0 xl:right-0 xl:h-[420px] xl:w-[600px]">
        <div className="flex h-9 shrink-0 items-center gap-1.5 border-b border-slate-200 bg-slate-100 px-3.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          <span className="ml-4 flex h-5 max-w-[260px] flex-1 items-center rounded-md border border-slate-200 bg-white px-2 font-mono text-[10px] text-[#64748b]">
            app.fatura.com/dashboard
          </span>
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="flex w-14 shrink-0 flex-col items-center gap-3 bg-slate-900 pt-3.5">
            <span className="h-[26px] w-[26px] rounded-[7px] bg-[#004ac6]" />
            <span className="mt-2.5 h-1.5 w-[22px] rounded-[3px] bg-blue-400/60" />
            <span className="h-1.5 w-[22px] rounded-[3px] bg-slate-700" />
            <span className="h-1.5 w-[22px] rounded-[3px] bg-slate-700" />
            <span className="h-1.5 w-[22px] rounded-[3px] bg-slate-700" />
            <span className="h-1.5 w-[22px] rounded-[3px] bg-slate-700" />
          </div>

          <div className="flex flex-1 flex-col gap-3 bg-slate-50 p-4">
            <div className="grid grid-cols-3 gap-2.5">
              <Kpi label="Sales today" value="$1,842.50" />
              <Kpi label="Invoices" value="38" />
              <Kpi label="Low stock" value="12" tone="warn" />
            </div>

            <div className="rounded-[10px] border border-slate-200 bg-white p-3">
              <span className="mb-1.5 block text-[11px] font-bold text-slate-900">Weekly sales</span>
              <svg viewBox="0 0 460 110" width="100%" height="110" aria-hidden="true">
                <defs>
                  <linearGradient id="hero-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#004ac6" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#004ac6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M6 76 L80 60 L154 68 L228 46 L302 30 L376 18 L454 72 L454 104 L6 104 Z"
                  fill="url(#hero-area)"
                />
                <path
                  d="M6 76 L80 60 L154 68 L228 46 L302 30 L376 18 L454 72"
                  fill="none"
                  stroke="#004ac6"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="376" cy="18" r="4.5" fill="#004ac6" stroke="#ffffff" strokeWidth="2" />
              </svg>
            </div>

            <div className="overflow-hidden rounded-[10px] border border-slate-200 bg-white">
              {INVOICES.map((invoice) => (
                <div
                  key={invoice.number}
                  className="flex justify-between border-b border-slate-100 px-3 py-2 text-[11px] last:border-b-0"
                >
                  <span className="font-mono text-slate-900">{invoice.number}</span>
                  <span className="text-slate-700">{invoice.customer}</span>
                  <span className="font-mono font-semibold">{invoice.total}</span>
                  <span
                    className={`rounded-full px-2 py-px font-medium ${
                      invoice.status === 'Paid'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {invoice.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Phone */}
      <div className="absolute bottom-0 left-0 hidden h-[404px] w-[200px] rounded-[34px] border border-white/15 bg-slate-950 p-2 shadow-[0_30px_60px_rgba(2,6,23,0.55)] xl:block">
        <div className="flex h-full w-full flex-col overflow-hidden rounded-[27px] bg-slate-50">
          <div className="flex h-[22px] shrink-0 items-center justify-center">
            <span className="h-3.5 w-[60px] rounded-full bg-slate-950" />
          </div>
          <div className="flex h-[34px] shrink-0 items-center justify-center border-b border-slate-200 bg-white text-xs font-semibold">
            Scan and sell
          </div>
          <div className="flex flex-1 flex-col gap-[7px] p-2.5">
            <div className="relative flex h-16 items-center justify-center rounded-xl bg-slate-900">
              <span className="h-9 w-[110px] rounded-lg border-2 border-[#4edea3]" />
              <span className="absolute top-1/2 left-1/2 -ml-12 h-0.5 w-24 bg-[#4edea3]" />
            </div>
            {CART.map((line) => (
              <div
                key={line.name}
                className={`flex justify-between rounded-[10px] border px-2.5 py-[7px] text-[10px] ${
                  line.highlight ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white'
                }`}
              >
                <span>{line.name}</span>
                <span className="font-mono font-semibold">{line.qty}</span>
              </div>
            ))}
            <div className="mt-auto flex items-baseline justify-between px-0.5">
              <span className="text-[10px] text-[#64748b]">Total</span>
              <span className="font-mono text-base font-bold">$86.40</span>
            </div>
            <span className="flex h-[34px] items-center justify-center rounded-[10px] bg-[#004ac6] text-[11px] font-semibold text-white">
              Issue invoice
            </span>
          </div>
          <div className="grid h-10 shrink-0 grid-cols-4 place-items-center border-t border-slate-200 bg-white">
            <span className="h-3.5 w-3.5 rounded bg-slate-300" />
            <span className="h-3.5 w-3.5 rounded bg-[#004ac6]" />
            <span className="h-3.5 w-3.5 rounded bg-slate-300" />
            <span className="h-3.5 w-3.5 rounded bg-slate-300" />
          </div>
        </div>
      </div>

      {/* Floating confirmation */}
      <div className="absolute top-[58px] left-[176px] hidden items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_18px_40px_rgba(2,6,23,0.35)] xl:flex">
        <span className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-emerald-50 text-[#007d55]">
          <Check className="h-[18px] w-[18px]" strokeWidth={2.2} />
        </span>
        <span>
          <span className="block text-[13px] font-bold text-[#0b1c30]">Invoice F-2026/0185 issued</span>
          <span className="block text-xs text-[#434655]">Stock updated automatically</span>
        </span>
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
            Dashboard
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
          <span className="mt-7 text-[11px] font-semibold text-[#cbd5e1]">Point at a barcode</span>
          <div className="relative mt-12 h-[90px] w-[140px] rounded-[14px] border-2 border-[#4edea3] sm:mt-[70px]">
            <span className="absolute top-11 right-2.5 left-2.5 h-0.5 bg-[#4edea3]" />
          </div>
          <div className="mt-auto mb-3.5 w-[164px] rounded-[14px] bg-white px-3 py-2.5">
            <span className="block text-[10px] font-bold text-[#0b1c30]">USB-C charger 65 W</span>
            <span className="mt-0.5 block font-mono text-[9px] text-[#64748b]">8412345678905</span>
            <span className="mt-2 flex h-[26px] items-center justify-center rounded-lg bg-[#004ac6] text-[10px] font-semibold text-white">
              Add to invoice
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
