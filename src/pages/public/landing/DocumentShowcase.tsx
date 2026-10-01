import { Check, FileCheck2, FileText, Printer, Receipt, Truck, type LucideIcon } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import { t } from '../../../i18n'
import { cn } from '../../../lib/cn'
import type { PrintableType } from '../../../types/printables'
import { PrintSheetView } from '../../app/printSheets'
import { Reveal } from './hooks'
import { SAMPLE_COMPANY, SAMPLE_DOCUMENTS, SAMPLE_THEME } from './sampleDocuments'

const SHEET_WIDTH = 794
const SHEET_HEIGHT = 1123

type Tab = {
  id: PrintableType
  icon: LucideIcon
  title: string
  blurb: string
  points: string[]
}

const TABS: Tab[] = [
  {
    id: 'factura',
    icon: Receipt,
    title: 'Invoice',
    blurb: 'The tax invoice your customer pays against.',
    points: ['IVA per line with a summary by rate', 'Discount and recargo de equivalencia', 'Paid, pending and voided stamps'],
  },
  {
    id: 'quotation',
    icon: FileText,
    title: 'Quotation',
    blurb: 'Prices with and without tax, before any stock moves.',
    points: ['Net and with-IVA columns side by side', 'Conditions printed under the totals', 'Turns into an invoice in one click'],
  },
  {
    id: 'proforma',
    icon: FileCheck2,
    title: 'Proforma',
    blurb: 'An agreed price for a shipment, settled in parts.',
    points: ['Pay line by line as goods are collected', 'Paid to date and balance due', 'Clearly marked as not a tax invoice'],
  },
  {
    id: 'albaran',
    icon: Truck,
    title: 'Delivery note',
    blurb: 'A plain slip that travels with the goods.',
    points: ['No company details on the slip', 'Space for a signature on receipt', 'Keeps stock moving without a tax invoice'],
  },
]

/** Shows the real A4 sheet shrunk to whatever width it is given. */
function ScaledSheet({ type }: { type: PrintableType }) {
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.5)

  useLayoutEffect(() => {
    const node = box.current
    if (!node) return

    const fit = () => setScale(node.clientWidth / SHEET_WIDTH)
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={box}
      className="relative w-full overflow-hidden rounded-lg bg-white shadow-[0_30px_70px_rgba(2,6,23,0.5)] ring-1 ring-white/10"
      style={{ height: SHEET_HEIGHT * scale }}
    >
      {/* The fade lives on the outer layer: an animation's end frame would override the scale below. */}
      <div key={type} aria-hidden="true" className="landing-rise pointer-events-none absolute inset-0 select-none">
        <div
          className="origin-top-left"
          style={{ width: SHEET_WIDTH, height: SHEET_HEIGHT, transform: `scale(${scale})` }}
        >
          <PrintSheetView
            document={SAMPLE_DOCUMENTS[type]}
            company={SAMPLE_COMPANY}
            currency="EUR"
            theme={SAMPLE_THEME[type]}
            logoSrc={null}
          />
        </div>
      </div>
    </div>
  )
}

export function DocumentShowcase() {
  const [active, setActive] = useState<PrintableType>('factura')
  const current = TABS.find((tab) => tab.id === active) ?? TABS[0]

  return (
    <section
      id="documents"
      className="relative scroll-mt-20 overflow-hidden bg-[#0b1c30] px-5 py-20 sm:py-28"
      style={{
        backgroundImage:
          'radial-gradient(700px 420px at 85% 10%, rgba(37,99,235,0.28), rgba(11,28,48,0) 70%), radial-gradient(520px 360px at 5% 95%, rgba(78,222,163,0.12), rgba(11,28,48,0) 70%)',
      }}
    >
      <div className="mx-auto max-w-[1200px]">
        <Reveal className="mx-auto max-w-[720px] text-center">
          <span className="text-[13px] font-bold tracking-[0.1em] text-[#4edea3] uppercase">
            {t('public.docsEyebrow', 'Documents')}
          </span>
          <h2 className="mt-3 text-[32px] leading-[1.12] font-extrabold tracking-[-0.03em] text-white sm:text-[44px]">
            {t('public.docsTitle', 'Four documents, each one made to be sent.')}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#cbd5e1] sm:text-lg">
            {t(
              'public.docsBody',
              'Every document has its own layout, and all of them carry your logo, colour and notes. Download as PDF or image, or send straight to WhatsApp.',
            )}
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-[minmax(0,1fr)] items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:gap-16">
          <Reveal className="hidden lg:sticky lg:top-28 lg:block">
            <div role="tablist" aria-label={t('public.docsTabs', 'Document types')} className="flex flex-col gap-3">
              {TABS.map((tab) => {
                const Icon = tab.icon
                const on = tab.id === active
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    id={`doc-tab-${tab.id}`}
                    aria-selected={on}
                    aria-controls="doc-panel"
                    onClick={() => setActive(tab.id)}
                    className={cn(
                      'group flex w-full cursor-pointer items-start gap-4 rounded-2xl border p-5 text-left transition-all focus-visible:ring-2 focus-visible:ring-[#4edea3] focus-visible:outline-none',
                      on
                        ? 'border-white/20 bg-white/10 shadow-[0_18px_40px_rgba(2,6,23,0.3)]'
                        : 'border-white/8 bg-white/[0.03] hover:border-white/16 hover:bg-white/[0.06]',
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors',
                        on ? 'bg-[#004ac6] text-white' : 'bg-white/8 text-[#cbd5e1] group-hover:text-white',
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[17px] font-bold text-white">{tab.title}</span>
                      <span className="mt-0.5 block text-[14.5px] leading-relaxed text-[#cbd5e1]">{tab.blurb}</span>
                      {on ? (
                        <span className="landing-rise mt-3.5 flex flex-col gap-2">
                          {tab.points.map((point) => (
                            <span key={point} className="flex items-start gap-2.5 text-[14px] text-[#e2e8f0]">
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#4edea3]" strokeWidth={2.6} />
                              {point}
                            </span>
                          ))}
                        </span>
                      ) : null}
                    </span>
                  </button>
                )
              })}
            </div>
          </Reveal>

          <Reveal delay={120}>
            {/* On a phone the list above is hidden: the types become chips right over the sheet. */}
            <div
              role="tablist"
              aria-label={t('public.docsTabs', 'Document types')}
              className="mb-5 flex gap-2 overflow-x-auto pb-1 lg:hidden"
            >
              {TABS.map((tab) => {
                const Icon = tab.icon
                const on = tab.id === active
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    id={`doc-chip-${tab.id}`}
                    aria-selected={on}
                    aria-controls="doc-panel"
                    onClick={() => setActive(tab.id)}
                    className={cn(
                      'inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full border px-4 py-2.5 text-[14px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[#4edea3] focus-visible:outline-none',
                      on
                        ? 'border-transparent bg-[#004ac6] text-white'
                        : 'border-white/14 bg-white/5 text-[#e2e8f0] hover:bg-white/10',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.title}
                  </button>
                )
              })}
            </div>

            <div id="doc-panel" role="tabpanel" aria-labelledby={`doc-tab-${active}`} className="relative">
              <ScaledSheet type={active} />

              <span className="landing-float absolute -top-4 -left-3 hidden items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-[12.5px] font-bold text-[#0b1c30] shadow-[0_18px_40px_rgba(2,6,23,0.35)] sm:flex">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-[#e5eeff] text-[#004ac6]">
                  <Printer className="h-3.5 w-3.5" />
                </span>
                {t('public.docsChipPrint', 'PDF, image or WhatsApp')}
              </span>
            </div>
            <p className="mt-4 text-center text-[13px] text-[#94a3b8]">
              {t('public.docsCaption', 'Sample {doc}. Yours carries your own logo, colour and notes.').replace(
                '{doc}',
                current.title.toLowerCase(),
              )}
            </p>

            <div className="mt-6 rounded-2xl border border-white/12 bg-white/8 p-5 lg:hidden">
              <p className="m-0 text-[16px] font-bold text-white">{current.title}</p>
              <p className="mt-1 mb-0 text-[14.5px] leading-relaxed text-[#cbd5e1]">{current.blurb}</p>
              <ul className="mt-3.5 m-0 flex list-none flex-col gap-2 p-0">
                {current.points.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-[14px] text-[#e2e8f0]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#4edea3]" strokeWidth={2.6} />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
