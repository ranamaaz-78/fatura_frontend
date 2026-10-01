import { Barcode, BarChart3, BadgeCheck, Boxes, MessageCircle, ScanLine, Users, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { BarcodeSvg } from '../../../components/ui/BarcodeSvg'
import { t } from '../../../i18n'
import { cn } from '../../../lib/cn'
import { Reveal } from './hooks'

type Tone = 'light' | 'navy' | 'blue'

const TONES: Record<Tone, { card: string; title: string; body: string; icon: string }> = {
  light: {
    card: 'border border-[#e5eeff] bg-white hover:shadow-[0_22px_50px_rgba(2,6,23,0.09)]',
    title: 'text-[#0b1c30]',
    body: 'text-[#434655]',
    icon: 'bg-[#e5eeff] text-[#004ac6]',
  },
  navy: {
    card: 'border border-white/8 bg-[#0b1c30] hover:shadow-[0_22px_50px_rgba(2,6,23,0.35)]',
    title: 'text-white',
    body: 'text-[#cbd5e1]',
    icon: 'bg-white/10 text-[#4edea3]',
  },
  blue: {
    card: 'border border-[#2563eb]/40 bg-[#004ac6] hover:shadow-[0_22px_50px_rgba(0,74,198,0.35)]',
    title: 'text-white',
    body: 'text-[#dbe1ff]',
    icon: 'bg-white/15 text-white',
  },
}

function Card({
  icon: Icon,
  title,
  body,
  tone = 'light',
  span,
  delay,
  children,
}: {
  icon: LucideIcon
  title: string
  body: string
  tone?: Tone
  span: string
  delay: number
  children: ReactNode
}) {
  const look = TONES[tone]
  return (
    <Reveal delay={delay} className={span}>
      <article
        className={cn(
          'group relative flex h-full flex-col overflow-hidden rounded-[28px] p-7 transition-shadow duration-300 sm:p-8',
          look.card,
        )}
      >
        <span className={cn('inline-flex h-12 w-12 items-center justify-center rounded-2xl', look.icon)}>
          <Icon className="h-6 w-6" />
        </span>
        <h3 className={cn('mt-5 text-[21px] font-bold tracking-[-0.01em]', look.title)}>{title}</h3>
        <p className={cn('mt-2 max-w-[460px] text-[15.5px] leading-relaxed', look.body)}>{body}</p>
        <div className="mt-6 flex flex-1 items-end">{children}</div>
      </article>
    </Reveal>
  )
}

/* ---- small illustrations, built from the same pieces as the real screens ---- */

function ScanVisual() {
  return (
    <div className="grid w-full items-center gap-4 sm:grid-cols-[1fr_auto]">
      <div className="relative overflow-hidden rounded-2xl bg-white px-5 py-4">
        <BarcodeSvg code="8412345678905" className="h-[72px] w-full" />
        <span className="landing-scan absolute inset-x-3 h-0.5 rounded-full bg-[#4edea3] shadow-[0_0_14px_3px_rgba(78,222,163,0.7)]" />
      </div>
      <div className="flex flex-col gap-2 text-[13px]">
        {[
          ['HDMI cable 2 m', 'x2'],
          ['USB-C charger', 'x1'],
        ].map(([name, qty], index) => (
          <span
            key={name}
            className={cn(
              'flex items-center justify-between gap-6 rounded-xl border px-3.5 py-2',
              index === 1 ? 'border-[#4edea3]/50 bg-[#4edea3]/10 text-white' : 'border-white/12 bg-white/5 text-[#e2e8f0]',
            )}
          >
            {name}
            <span className="font-bold">{qty}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function StockVisual() {
  const rows = [
    { name: 'Cordless drill 18 V', value: 78, tone: 'bg-[#004ac6]' },
    { name: 'Work gloves, L', value: 46, tone: 'bg-[#004ac6]' },
    { name: 'Wood screws 4 x 40', value: 12, tone: 'bg-amber-500' },
  ]
  return (
    <div className="flex w-full flex-col gap-3.5">
      {rows.map((row) => (
        <div key={row.name}>
          <div className="mb-1.5 flex items-center justify-between text-[13px]">
            <span className="font-medium text-[#0b1c30]">{row.name}</span>
            {row.value < 20 ? (
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
                {t('public.lowStock', 'Low stock')}
              </span>
            ) : (
              <span className="text-xs text-[#64748b]">{row.value}</span>
            )}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#eff4ff]">
            <span className={cn('block h-full rounded-full', row.tone)} style={{ width: `${row.value}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function LabelVisual() {
  return (
    <div className="w-full rounded-2xl border border-dashed border-[#c3d4ff] bg-[#f8f9ff] p-4">
      <div className="mx-auto w-full max-w-[210px] rounded-lg border border-[#e5eeff] bg-white px-4 pt-3 pb-2 shadow-sm">
        <span className="block text-[11px] font-bold text-[#0b1c30]">USB-C charger 65 W</span>
        <BarcodeSvg code="8412345678905" className="mt-1 h-[58px] w-full" />
      </div>
    </div>
  )
}

function PeopleVisual() {
  const rows = [
    { name: 'Taller Rivas', tag: 'Owes €245.60', tone: 'bg-amber-50 text-amber-700', initials: 'TR' },
    { name: 'Luna Textiles', tag: 'Paid', tone: 'bg-emerald-50 text-emerald-700', initials: 'LT' },
    { name: 'Gráficas Sur', tag: 'Paid', tone: 'bg-emerald-50 text-emerald-700', initials: 'GS' },
  ]
  return (
    <div className="flex w-full flex-col gap-2">
      {rows.map((row) => (
        <div key={row.name} className="flex items-center gap-3 rounded-xl border border-[#e5eeff] bg-[#f8f9ff] px-3 py-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#e5eeff] text-[11px] font-bold text-[#004ac6]">
            {row.initials}
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[#0b1c30]">{row.name}</span>
          <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold', row.tone)}>{row.tag}</span>
        </div>
      ))}
    </div>
  )
}

function ReportVisual() {
  const bars = [38, 52, 44, 66, 58, 82, 74]
  return (
    <div className="w-full">
      <div className="flex h-[96px] items-end gap-2">
        {bars.map((height, index) => (
          <span
            key={index}
            className={cn('flex-1 rounded-t-md', index === 5 ? 'bg-[#004ac6]' : 'bg-[#c3d4ff]')}
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-[12px] text-[#64748b]">
        <span>{t('public.reportWeek', 'Sales this week')}</span>
        <span className="font-bold text-[#0b1c30]">€1,842.50</span>
      </div>
    </div>
  )
}

function TaxVisual() {
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {['IVA 21%', 'IVA 10%', 'IVA 4%', 'Exempt'].map((chip, index) => (
          <span
            key={chip}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-[13px] font-semibold',
              index === 0 ? 'bg-white text-[#004ac6]' : 'bg-white/12 text-white',
            )}
          >
            {chip}
          </span>
        ))}
      </div>
      <div className="grid gap-2 text-[13px] sm:grid-cols-2">
        <span className="flex items-center justify-between rounded-xl bg-white/10 px-3.5 py-2.5 text-white">
          {t('public.recargo', 'Recargo de equivalencia')}
          <span className="font-bold text-[#4edea3]">5.2%</span>
        </span>
        <span className="flex items-center justify-between rounded-xl bg-white/10 px-3.5 py-2.5 text-white">
          N.I.F / N.I.E
          <span className="font-bold text-[#4edea3]">B87654321</span>
        </span>
      </div>
    </div>
  )
}

function ShareVisual() {
  return (
    <div className="flex w-full flex-col gap-2.5">
      <span className="max-w-[78%] rounded-2xl rounded-tl-sm bg-[#f1f5f9] px-4 py-2.5 text-[13px] text-[#334155]">
        {t('public.shareCustomer', 'Hi Marta, here is your invoice.')}
      </span>
      <span className="ml-auto flex max-w-[86%] items-center gap-3 rounded-2xl rounded-tr-sm bg-[#dcf8c6] px-3.5 py-3 text-[13px] text-[#0b1c30]">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[10px] font-extrabold text-rose-600">
          PDF
        </span>
        <span className="min-w-0">
          <span className="block truncate font-semibold">F-2026-0185.pdf</span>
          <span className="block text-[11px] text-[#5b6b5b]">2 pages · sent ✓✓</span>
        </span>
      </span>
    </div>
  )
}

export function FeatureBento() {
  return (
    <section id="features" className="scroll-mt-20 px-5 py-20 sm:py-28">
      <div className="mx-auto max-w-[1200px]">
        <Reveal className="mx-auto max-w-[760px] text-center">
          <span className="text-[13px] font-bold tracking-[0.1em] text-[#004ac6] uppercase">
            {t('public.featuresEyebrow', 'Features')}
          </span>
          <h2 className="mt-3 text-[32px] leading-[1.12] font-extrabold tracking-[-0.03em] text-[#0b1c30] sm:text-[44px]">
            {t('public.featuresTitle', 'Everything your counter needs, nothing it does not.')}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#434655] sm:text-lg">
            {t(
              'public.featuresBody',
              'Every sale updates your stock. Every product has a barcode. Every invoice is ready to print or share in one tap.',
            )}
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-6">
          <Card
            icon={ScanLine}
            tone="navy"
            span="lg:col-span-3"
            delay={0}
            title="Scan and sell"
            body="Use a USB or Bluetooth scanner at the counter, or your phone camera anywhere. Scan the same item twice and the quantity goes up."
          >
            <ScanVisual />
          </Card>
          <Card
            icon={Boxes}
            span="lg:col-span-3"
            delay={80}
            title="Stock you can trust"
            body="Every sale and purchase moves stock with a full history. Low stock alerts tell you what to reorder before the shelf is empty."
          >
            <StockVisual />
          </Card>

          <Card
            icon={Barcode}
            span="lg:col-span-2"
            delay={0}
            title="Barcode labels"
            body="Import your catalog from Excel, generate barcodes for items that have none, and print sharp label sheets."
          >
            <LabelVisual />
          </Card>
          <Card
            icon={Users}
            span="lg:col-span-2"
            delay={80}
            title="Customers and suppliers"
            body="See who owes you and every document you exchanged. Record payments against invoices in seconds."
          >
            <PeopleVisual />
          </Card>
          <Card
            icon={BarChart3}
            span="md:col-span-2 lg:col-span-2"
            delay={160}
            title="Reports that answer"
            body="Sales by day, best sellers, unpaid invoices and stock value, ready to export to Excel."
          >
            <ReportVisual />
          </Card>

          <Card
            icon={BadgeCheck}
            tone="blue"
            span="lg:col-span-3"
            delay={0}
            title="Ready for Spanish tax"
            body="Set your own IVA rates, add recargo de equivalencia on invoices and quotations, and keep N.I.F / N.I.E on every client."
          >
            <TaxVisual />
          </Card>
          <Card
            icon={MessageCircle}
            span="lg:col-span-3"
            delay={80}
            title="Share on WhatsApp"
            body="Send the PDF to your customer straight from the sale, or download it as an image. Your logo and colours come with it."
          >
            <ShareVisual />
          </Card>
        </div>
      </div>
    </section>
  )
}
