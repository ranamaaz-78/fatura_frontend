import { useQuery } from '@tanstack/react-query'
import { Fragment, useEffect, type ReactNode } from 'react'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { formatDate } from '../../lib/format'
import { formatCents } from '../../lib/money'
import { pickPrintTemplate, printSheetStyle } from '../../lib/printTheme'
import { ensurePrintFonts } from '../../lib/printFonts'
import { getPrintTemplates, loadLogoBlob } from '../../services/printables'
import type { Company } from '../../types/module01'
import type { PrintTemplate } from '../../types/printables'
import { saleDisplayStatus, type SaleDisplayStatus, type SaleDocument, type SaleLine } from '../../types/sales'

export type PrintSheetProps = {
  document: SaleDocument
  company: Company | null
  currency: string
  theme?: PrintTemplate
  logoSrc?: string | null
}

type SheetProps = PrintSheetProps & {
  lines: SaleLine[]
  issued: string
  theme: PrintTemplate
  logoSrc: string | null
}

/*
 * Four documents, four looks:
 *   Invoice    classic letterhead, hairline rules, IVA summary.
 *   Quotation  a full-width colour band, tinted cards, total in a colour block.
 *   Proforma   a centred letterhead, a dark table head, a boxed total.
 *   Albarán    a plain delivery slip: no company details at all, dashed rules, a signature.
 * Figures are set in tabular numerals so the columns line up.
 */

/** Past this many lines a sheet tightens up, so the totals still fit on the one A4 page. */
const DENSE_AFTER = 8
const D = 'group-data-[dense=true]:'

function Label({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('m-0 text-[9.5px] font-semibold tracking-[0.08em] text-[#64748b] uppercase', className)}>
      {children}
    </p>
  )
}

function paymentText(status: SaleDisplayStatus): string {
  if (status === 'voided') return t('sales.voided', 'Voided')
  if (status === 'partial') return t('sales.partial', 'Partial')
  return status === 'paid' ? t('sales.paid', 'Paid') : t('sales.pending', 'Pending')
}

function StatusBadge({ status, onAccent = false }: { status: SaleDisplayStatus; onAccent?: boolean }) {
  return (
    <span
      className={cn(
        'inline-block rounded px-2 py-[3px] text-[9.5px] font-semibold tracking-[0.06em] uppercase',
        onAccent
          ? 'bg-white/20 text-white'
          : status === 'voided'
            ? 'bg-[#fff1f2] text-[#be123c]'
            : status === 'partial'
              ? 'bg-[#f0f9ff] text-[#0369a1]'
              : status === 'paid'
                ? 'bg-[#ecfdf5] text-[#047857]'
                : 'bg-[#fffbeb] text-[#b45309]',
      )}
    >
      {paymentText(status)}
    </span>
  )
}

function taxId(document: SaleDocument): string | null {
  return document.client_nif || document.client_nie
}

function clientTitle(document: SaleDocument): string {
  return document.client_company || document.client_name
}

function clientAttn(document: SaleDocument): string | null {
  return document.client_company ? document.client_name : null
}

function companyInitials(company: Company | null): string {
  const parts = (company?.name ?? '').trim().split(/\s+/).filter(Boolean)
  // A name that starts with its own acronym ("YK Digital Solutions") keeps it.
  const first = parts[0] ?? ''
  if (first.length <= 3 && /[A-Z]/.test(first) && first === first.toUpperCase()) return first
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return (parts[0] ?? '·').slice(0, 2).toUpperCase()
}

function companyPlace(company: Company | null): string[] {
  if (!company) return []
  const lines: string[] = []
  if (company.address) lines.push(company.address)
  const cityCountry = [company.city, company.country].filter(Boolean).join(', ')
  if (cityCountry) lines.push(cityCountry)
  return lines
}

function companyContact(company: Company | null): string {
  return [company?.email, company?.phone].filter(Boolean).join(' · ')
}

function qtyText(value: number): string {
  return String(value)
}

/** A line as the customer reads it: quantity x price less the line discount, before the bill discount. */
function grossOf(line: SaleLine): { base: number; total: number } {
  const base = line.base_cents + (line.bill_discount_cents ?? 0)
  return { base, total: base + Math.round(base * (line.iva_percent / 100)) }
}

function taxGroups(lines: SaleLine[]): { rate: number; base: number; tax: number }[] {
  const groups = new Map<number, { base: number; tax: number }>()
  for (const line of lines) {
    const group = groups.get(line.iva_percent) ?? { base: 0, tax: 0 }
    group.base += line.base_cents
    group.tax += line.tax_cents
    groups.set(line.iva_percent, group)
  }
  return [...groups.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([rate, group]) => ({ rate, ...group }))
}

type TotalRow = { label: ReactNode; value: string }

/** Subtotal and discount, for a bill with a discount on the whole of it. */
function discountRows(document: SaleDocument, currency: string): TotalRow[] {
  if (!document.discount_cents) return []
  return [
    {
      label: t('sales.subtotal', 'Subtotal'),
      value: formatCents(document.base_cents + document.discount_cents, currency),
    },
    {
      label: `${t('sales.discount', 'Discount')}${document.discount_type === 'percent' ? ` (${document.discount_value}%)` : ''}`,
      value: `−${formatCents(document.discount_cents, currency)}`,
    },
  ]
}

function recargoRows(document: SaleDocument, currency: string): TotalRow[] {
  if (!document.recargo_cents) return []
  return [
    {
      label: `${t('sales.recargo', 'Recargo de equivalencia')} (${document.recargo_percent}%)`,
      value: formatCents(document.recargo_cents, currency),
    },
  ]
}

function discountColumn(lines: SaleLine[], width: number): Column[] {
  if (!lines.some((line) => line.discount_percent > 0)) return []
  return [
    {
      key: 'dto',
      label: t('sales.dto', 'Disc.'),
      width,
      render: (line) => (line.discount_percent ? `${line.discount_percent}%` : '—'),
    },
  ]
}

/* ------------------------------------------------------------------ shared pieces */

function SheetFrame({
  children,
  theme,
  voided,
  lineCount,
  denseAfter = DENSE_AFTER,
  row = false,
  className,
}: {
  children: ReactNode
  theme: PrintTemplate
  voided: boolean
  lineCount: number
  /** Lines past which this sheet tightens up; the roomier layouts go dense sooner. */
  denseAfter?: number
  /** Lay the sheet out side by side (a side panel) instead of top to bottom. */
  row?: boolean
  className?: string
}) {
  return (
    <article
      id="printable-invoice"
      data-dense={lineCount > denseAfter}
      style={printSheetStyle(theme.primary_color, theme.font_key)}
      className="group relative mx-auto box-border h-[1123px] w-[794px] overflow-hidden bg-white text-[#0f172a] shadow-[0_1px_4px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/80 print:fixed print:inset-0 print:mx-0 print:h-full print:w-full print:shadow-none print:ring-0"
    >
      {voided ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-[46%] left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 -rotate-[24deg] rounded-xl border-[6px] border-[#be123c]/20 px-10 py-1 text-[104px] font-bold tracking-[0.12em] text-[#be123c]/15 uppercase"
        >
          {t('sales.voidStamp', 'Void')}
        </span>
      ) : null}
      <div className={cn('relative box-border flex h-full min-h-0', row ? 'flex-row' : 'flex-col', className)}>{children}</div>
    </article>
  )
}

/**
 * Looks at the loaded logo once. A logo on a transparent or white ground sits straight on the
 * page; one with its own coloured ground (a photo, a badge) gets rounded corners and a hairline
 * frame, so it reads as a deliberate tile rather than a pasted rectangle.
 */
function frameIfOpaque(event: { currentTarget: HTMLImageElement }) {
  const img = event.currentTarget
  try {
    const width = Math.max(1, Math.min(img.naturalWidth, 64))
    const height = Math.max(1, Math.min(img.naturalHeight, 64))
    const canvas = window.document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return
    context.drawImage(img, 0, 0, width, height)
    const { data } = context.getImageData(0, 0, width, height)
    const points = [
      [0, 0],
      [width - 1, 0],
      [0, height - 1],
      [width - 1, height - 1],
      [Math.floor(width / 2), 0],
      [0, Math.floor(height / 2)],
    ]
    const framed = points.every(([x, y]) => {
      const at = (y * width + x) * 4
      const [r, g, b, a] = [data[at], data[at + 1], data[at + 2], data[at + 3]]
      const blendsIn = a < 200 || (r > 246 && g > 246 && b > 246)
      return !blendsIn
    })
    img.dataset.framed = framed ? 'true' : 'false'
  } catch {
    // An image the canvas cannot read simply keeps the plain look.
  }
}

/** The uploaded logo at its own proportions, fitted inside a box and never stretched or enlarged. */
function LogoImage({
  src,
  alt,
  maxHeight,
  maxWidth,
}: {
  src: string
  alt: string
  maxHeight: number
  maxWidth: number
}) {
  return (
    <img
      src={src}
      alt={alt}
      onLoad={frameIfOpaque}
      style={{ maxHeight, maxWidth }}
      className="block h-auto w-auto shrink-0 object-contain data-[framed=true]:rounded-[10px] data-[framed=true]:ring-1 data-[framed=true]:ring-[#e2e8f0]"
    />
  )
}

/**
 * The company's mark: the uploaded logo, or its initials when there is none.
 * Hidden entirely when "Show logo" is off in Printables.
 */
function LogoMark({
  company,
  logoSrc,
  show,
  tone = 'solid',
  size = 48,
  imageSize,
  maxWidth = 230,
}: {
  company: Company | null
  logoSrc: string | null
  show: boolean
  tone?: 'solid' | 'outline'
  size?: number
  /** Height allowed for an uploaded logo; it is roomier than the initials tile. */
  imageSize?: number
  maxWidth?: number
}) {
  if (!show) return null

  if (logoSrc) {
    return <LogoImage src={logoSrc} alt={company?.name ?? ''} maxHeight={imageSize ?? Math.round(size * 1.35)} maxWidth={maxWidth} />
  }

  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-xl font-semibold tracking-[-0.02em]',
        tone === 'solid' && 'bg-[var(--print-accent)] text-white',
        tone === 'outline' && 'border-2 border-[var(--print-accent)] text-[var(--print-accent)]',
      )}
    >
      {companyInitials(company)}
    </span>
  )
}

function ClientBlock({ document, size = 'md' }: { document: SaleDocument; size?: 'md' | 'lg' }) {
  const attn = clientAttn(document)
  const id = taxId(document)
  return (
    <>
      <p className={cn('mt-2.5 mb-0 font-semibold text-[#0f172a]', size === 'lg' ? 'text-[16px]' : 'text-[14px]')}>
        {clientTitle(document)}
      </p>
      <p className="mt-1 mb-0 text-[11px] leading-[1.65] text-[#475569]">
        {attn ? (
          <span className="block">
            {t('sales.attn', 'Attn.')} {attn}
          </span>
        ) : null}
        {id ? <span className="block">N.I.F / N.I.E {id}</span> : null}
        {document.client_phone ? <span className="block">{document.client_phone}</span> : null}
        {document.client_address ? <span className="block">{document.client_address}</span> : null}
      </p>
    </>
  )
}

type MetaRow = { label: string; value: ReactNode; strong?: boolean }

function MetaList({ rows, className }: { rows: MetaRow[]; className?: string }) {
  return (
    <dl className={cn('m-0 grid grid-cols-[auto_auto] gap-x-10 gap-y-2 text-[11px]', className)}>
      {rows.map((row) => (
        <Fragment key={row.label}>
          <dt className="text-[#64748b]">{row.label}</dt>
          <dd className={cn('m-0 text-right text-[#0f172a] tabular-nums', row.strong ? 'font-semibold' : 'font-medium')}>
            {row.value}
          </dd>
        </Fragment>
      ))}
    </dl>
  )
}

type Column = {
  key: string
  label: string
  width: number
  className?: string
  render: (line: SaleLine) => ReactNode
}

type TableStyle = 'rule' | 'soft' | 'light' | 'slip'

type TableLook = {
  wrap: string
  head: string
  th: string
  /** Extra classes for every body cell. */
  td: string
  row: (index: number) => string
  pad: boolean
}

const TABLE: Record<TableStyle, TableLook> = {
  rule: {
    wrap: '',
    head: 'border-b border-[#0f172a]',
    th: 'pb-2.5 text-[#64748b]',
    td: '',
    row: () => 'border-b border-[#e2e8f0]',
    pad: false,
  },
  // Quotation: an accent underline on the head, softly striped rows, no outer box.
  soft: {
    wrap: '',
    head: 'border-b-2 border-[var(--print-accent)]',
    th: 'pb-2.5 text-[var(--print-accent)]',
    td: '',
    row: (index) => (index % 2 === 1 ? 'bg-[var(--print-stripe)]' : ''),
    pad: true,
  },
  // Proforma: nothing but faint row lines, so the page stays light next to its side panel.
  // Proforma: a soft rounded head bar and plain rows. Each head cell casts a 1px shadow of its own
  // colour to the right, which covers the sub-pixel gap a browser leaves between cells.
  light: {
    wrap: 'overflow-hidden rounded-t-lg',
    head: '',
    th: 'bg-[var(--print-soft)] py-3 text-[var(--print-accent)] shadow-[1px_0_0_var(--print-soft)]',
    td: '',
    row: () => 'border-b border-[#eef2f6]',
    pad: true,
  },
  slip: {
    wrap: '',
    head: 'border-y-2 border-[#0f172a]',
    th: 'py-2 text-[#0f172a]',
    td: '',
    row: () => 'border-b border-dashed border-[#94a3b8]',
    pad: false,
  },
}

function ItemsTable({
  lines,
  columns,
  variant,
  className,
}: {
  lines: SaleLine[]
  columns: Column[]
  variant: TableStyle
  className?: string
}) {
  const style = TABLE[variant]
  const edge = style.pad ? 'first:pl-3.5 last:pr-3.5' : ''

  return (
    <div className={cn(style.wrap, className)}>
      <table className={cn('w-full table-fixed border-collapse text-[11.5px]', `${D}text-[11px]`)}>
        <colgroup>
          <col style={{ width: style.pad ? 40 : 28 }} />
          <col />
          {columns.map((column) => (
            <col key={column.key} style={{ width: column.width }} />
          ))}
        </colgroup>
        <thead>
          <tr className={style.head}>
            {['#', t('sales.description', 'Description')].map((label) => (
              <th key={label} className={cn('text-left text-[9.5px] font-semibold tracking-[0.08em] uppercase', style.th, edge)}>
                {label}
              </th>
            ))}
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn('text-right text-[9.5px] font-semibold tracking-[0.08em] uppercase', style.th, edge)}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => {
            const detail = [line.sr_number, line.description].filter(Boolean).join(' · ')
            const cell = cn('py-2.5 align-top', `${D}py-[5px]`, edge, style.td)
            return (
              <tr key={line.position} className={style.row(index)}>
                <td className={cn(cell, 'text-[#94a3b8] tabular-nums')}>{line.position}</td>
                <td className={cn(cell, 'pr-5')}>
                  <span className={cn('block font-medium text-[#0f172a]', `${D}inline`)}>{line.article}</span>
                  {detail ? (
                    <span className={cn('mt-0.5 block text-[10px] whitespace-nowrap text-[#94a3b8]', `${D}mt-0 ${D}ml-2 ${D}inline`)}>
                      {detail}
                    </span>
                  ) : null}
                </td>
                {columns.map((column) => (
                  <td key={column.key} className={cn(cell, 'text-right text-[#334155] tabular-nums', column.className)}>
                    {column.render(line)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function TotalRows({ rows }: { rows: TotalRow[] }) {
  return (
    <>
      {rows.map((row, index) => (
        <div key={index} className="flex items-baseline justify-between gap-4 py-[5px] group-data-[dense=true]:py-[3px]">
          <span className="text-[#64748b]">{row.label}</span>
          <span className="text-[#0f172a] tabular-nums">{row.value}</span>
        </div>
      ))}
    </>
  )
}

function TaxSummary({ lines, currency }: { lines: SaleLine[]; currency: string }) {
  const groups = taxGroups(lines)
  if (groups.length === 0) return <div />

  return (
    <div className="w-[280px]">
      <Label>{t('sales.taxBreakdown', 'IVA summary')}</Label>
      <table className="mt-2.5 w-full border-collapse text-[10.5px]">
        <thead>
          <tr className="border-b border-[#e2e8f0] text-[#64748b]">
            <th className="pb-1.5 text-left font-medium">{t('sales.rate', 'Rate')}</th>
            <th className="pb-1.5 text-right font-medium">{t('sales.base', 'Base')}</th>
            <th className="pb-1.5 text-right font-medium">IVA</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <tr key={group.rate} className="border-b border-[#f1f5f9] text-[#334155] tabular-nums">
              <td className="py-1.5">{group.rate}%</td>
              <td className="py-1.5 text-right">{formatCents(group.base, currency)}</td>
              <td className="py-1.5 text-right">{formatCents(group.tax, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function NotesAndTerms({
  notes,
  terms,
  termsLabel,
  className,
}: {
  notes: string | null
  terms: string
  termsLabel?: string
  className?: string
}) {
  const blocks = [
    notes?.trim() ? { label: t('sales.notes', 'Notes'), text: notes.trim() } : null,
    terms.trim() ? { label: termsLabel ?? t('printables.terms', 'Terms'), text: terms.trim() } : null,
  ].filter((block): block is { label: string; text: string } => block !== null)

  if (blocks.length === 0) return null

  return (
    <section className={cn('mt-11 grid gap-10', `${D}mt-7`, blocks.length === 2 ? 'grid-cols-2' : 'grid-cols-1', className)}>
      {blocks.map((block) => (
        <div key={block.label}>
          <Label>{block.label}</Label>
          <p className="mt-2 mb-0 text-[10.5px] leading-[1.7] whitespace-pre-wrap text-[#475569]">{block.text}</p>
        </div>
      ))}
    </section>
  )
}

function SignatureRow({ dashed = false, className }: { dashed?: boolean; className?: string }) {
  const rule = dashed ? 'block border-t border-dashed border-[#475569]' : 'block h-px bg-[#94a3b8]'
  return (
    <section className={cn('mt-14 grid grid-cols-[1fr_180px] gap-14', `${D}mt-9`, className)}>
      <div>
        <span className={rule} />
        <p className="mt-2 mb-0 text-[10px] text-[#64748b]">{t('printables.receivedBy', 'Received by (name and signature)')}</p>
      </div>
      <div>
        <span className={rule} />
        <p className="mt-2 mb-0 text-[10px] text-[#64748b]">{t('printables.signDate', 'Date')}</p>
      </div>
    </section>
  )
}

function PageMark({ document }: { document: SaleDocument }) {
  return (
    <span className="shrink-0 tabular-nums">
      {document.number} · {t('sales.pageOne', 'Page 1 of 1')}
    </span>
  )
}

/* ------------------------------------------------------------------ Invoice: classic letterhead */

function InvoiceSheet({ document, company, currency, lines, issued, theme, logoSrc }: SheetProps) {
  const display = saleDisplayStatus(document)
  const place = companyPlace(company)
  const contact = companyContact(company)

  const columns: Column[] = [
    { key: 'qty', label: t('sales.qty', 'Qty'), width: 48, render: (line) => qtyText(line.quantity) },
    { key: 'price', label: t('sales.unitPrice', 'Unit price'), width: 88, render: (line) => formatCents(line.unit_price, currency) },
    ...discountColumn(lines, 52),
    { key: 'iva', label: 'IVA', width: 46, render: (line) => `${line.iva_percent}%` },
    {
      key: 'amount',
      label: t('sales.amount', 'Amount'),
      width: 96,
      className: 'font-medium text-[#0f172a]',
      render: (line) => formatCents(grossOf(line).base, currency),
    },
  ]

  return (
    <SheetFrame theme={theme} voided={display === 'voided'} lineCount={lines.length} className={cn('px-14 pt-14 pb-10', `${D}pt-11 ${D}pb-8`)}>
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[5px] bg-[var(--print-accent)]" />

      <header className="flex items-start justify-between gap-10">
        <div className={cn('flex min-w-0 gap-4', theme.show_logo && logoSrc ? 'flex-col items-start gap-2.5' : 'items-start')}>
          <LogoMark company={company} logoSrc={logoSrc} show={theme.show_logo} imageSize={lines.length > 8 ? 54 : 68} />
          <div className="min-w-0">
            <p className="m-0 text-[16px] font-semibold tracking-[-0.01em]">{company?.name}</p>
            <p className={cn('mt-1.5 mb-0 text-[11px] leading-[1.65] text-[#64748b]', `${D}leading-[1.5]`)}>
              {place.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
              {contact ? <span className="block">{contact}</span> : null}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <h1 className="m-0 text-[32px] leading-none font-semibold tracking-[-0.025em] text-[var(--print-accent)]">
            {t('sales.invoiceTitle', 'Invoice')}
          </h1>
          <div className="mt-3">
            <StatusBadge status={display} />
          </div>
        </div>
      </header>

      <section className={cn('mt-12 flex items-start justify-between gap-10', `${D}mt-8`)}>
        <div className="min-w-0 flex-1">
          <Label>{t('sales.billTo', 'Bill to')}</Label>
          <ClientBlock document={document} />
        </div>
        <MetaList
          className="shrink-0"
          rows={[
            { label: t('sales.invoiceNumber', 'Invoice no.'), value: document.number, strong: true },
            { label: t('sales.issueDate', 'Issue date'), value: issued },
            ...(display === 'pending'
              ? [{ label: t('sales.amountDue', 'Amount due'), value: formatCents(document.total_cents, currency), strong: true }]
              : []),
          ]}
        />
      </section>

      <ItemsTable lines={lines} columns={columns} variant="rule" className={cn('mt-10', `${D}mt-7`)} />

      <section className={cn('mt-8 flex items-start justify-between gap-10', `${D}mt-5`)}>
        <TaxSummary lines={lines} currency={currency} />
        <div className="w-[280px] shrink-0 text-[11.5px]">
          <TotalRows
            rows={[
              ...discountRows(document, currency),
              { label: t('sales.taxableBase', 'Taxable base'), value: formatCents(document.base_cents, currency) },
              { label: 'IVA', value: formatCents(document.tax_cents, currency) },
              ...recargoRows(document, currency),
            ]}
          />
          <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-[#0f172a] pt-3">
            <span className="text-[12px] font-semibold">{t('sales.total', 'Total')}</span>
            <span className="text-[24px] font-semibold tracking-[-0.02em] text-[var(--print-accent)] tabular-nums">
              {formatCents(document.total_cents, currency)}
            </span>
          </div>
        </div>
      </section>

      <NotesAndTerms notes={document.notes} terms={theme.footer_notes} />
      {theme.show_signature ? <SignatureRow /> : null}

      <footer className="mt-auto flex items-end justify-between gap-8 border-t border-[#e2e8f0] pt-4 text-[9.5px] leading-[1.6] text-[#94a3b8]">
        <span className="min-w-0">{[company?.name, contact].filter(Boolean).join(' · ')}</span>
        <PageMark document={document} />
      </footer>
    </SheetFrame>
  )
}

/* ------------------------------------------------------------------ Quotation: open and airy */

function QuotationSheet({ document, company, currency, lines, issued, theme, logoSrc }: SheetProps) {
  const place = companyPlace(company)
  const contact = companyContact(company)

  const columns: Column[] = [
    { key: 'qty', label: t('sales.qty', 'Qty'), width: 44, render: (line) => qtyText(line.quantity) },
    { key: 'price', label: t('sales.unitPrice', 'Unit price'), width: 80, render: (line) => formatCents(line.unit_price, currency) },
    ...discountColumn(lines, 48),
    { key: 'iva', label: 'IVA', width: 44, render: (line) => `${line.iva_percent}%` },
    { key: 'net', label: t('sales.priceNet', 'Net'), width: 84, render: (line) => formatCents(grossOf(line).base, currency) },
    {
      key: 'gross',
      label: t('sales.priceGross', 'With IVA'),
      width: 92,
      className: 'font-semibold text-[#0f172a]',
      render: (line) => formatCents(grossOf(line).total, currency),
    },
  ]

  const stats: { label: string; value: string; accent?: boolean }[] = [
    { label: t('sales.date', 'Date'), value: issued },
    { label: t('sales.items', 'Items'), value: String(lines.length) },
    { label: t('sales.totalWithTax', 'Total with tax'), value: formatCents(document.total_cents, currency), accent: true },
  ]

  return (
    <SheetFrame theme={theme} voided={false} lineCount={lines.length} denseAfter={5} className={cn('px-14 pt-12 pb-10', `${D}pt-9 ${D}pb-8`)}>
      <header className="flex items-center justify-between gap-10">
        {theme.show_logo ? (
          <LogoMark company={company} logoSrc={logoSrc} show size={lines.length > 5 ? 46 : 60} imageSize={lines.length > 5 ? 58 : 76} />
        ) : (
          <p className="m-0 text-[18px] font-semibold tracking-[-0.01em]">{company?.name}</p>
        )}
        <div className="min-w-0 text-right text-[10.5px] leading-[1.65] text-[#64748b]">
          {theme.show_logo ? <p className="m-0 text-[12.5px] font-semibold text-[#0f172a]">{company?.name}</p> : null}
          {[...place, contact].filter(Boolean).map((line) => (
            <p key={line} className="m-0">
              {line}
            </p>
          ))}
        </div>
      </header>

      <section className={cn('mt-9 flex items-end justify-between gap-8 border-b border-[#e2e8f0] pb-6', `${D}mt-5 ${D}pb-4`)}>
        <div>
          <span aria-hidden="true" className="mb-4 block h-1 w-10 group-data-[dense=true]:hidden rounded-full bg-[var(--print-accent)]" />
          <h1 className="m-0 text-[44px] leading-none font-light group-data-[dense=true]:text-[34px] tracking-[-0.035em] text-[#0f172a]">
            {t('sales.quotationTitle', 'Quotation')}
          </h1>
          <p className="mt-2.5 mb-0 text-[12px] font-medium text-[#64748b] tabular-nums">{document.number}</p>
        </div>
        <div className="flex shrink-0 divide-x divide-[#e2e8f0]">
          {stats.map((stat) => (
            <div key={stat.label} className="px-5 text-right last:pr-0">
              <Label>{stat.label}</Label>
              <p
                className={cn(
                  'mt-1.5 mb-0 tabular-nums',
                  stat.accent ? 'text-[17px] font-semibold text-[var(--print-accent)]' : 'text-[13px] font-medium',
                )}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className={cn('mt-7 grid grid-cols-2 gap-10', `${D}mt-4`)}>
        <div className="border-l-[3px] border-[var(--print-accent)] pl-4">
          <Label>{t('sales.quotationFor', 'Prepared for')}</Label>
          <ClientBlock document={document} />
        </div>
        <div className="border-l-[3px] border-[#e2e8f0] pl-4">
          <Label>{t('sales.preparedBy', 'Prepared by')}</Label>
          <p className="mt-2.5 mb-0 text-[14px] font-semibold">{company?.name}</p>
          <p className="mt-1 mb-0 text-[11px] leading-[1.65] text-[#475569]">
            {company?.email ? <span className="block">{company.email}</span> : null}
            {company?.phone ? <span className="block">{company.phone}</span> : null}
          </p>
        </div>
      </section>

      <ItemsTable lines={lines} columns={columns} variant="soft" className={cn('mt-7', `${D}mt-5`)} />

      <section className={cn('mt-5 flex justify-end', `${D}mt-3`)}>
        <div className="w-[290px] text-[11.5px]">
          <TotalRows
            rows={[
              ...discountRows(document, currency),
              { label: t('sales.totalWithoutTax', 'Total without tax'), value: formatCents(document.base_cents, currency) },
              { label: 'IVA', value: formatCents(document.tax_cents, currency) },
              ...recargoRows(document, currency),
            ]}
          />
          <div className="mt-2 flex items-baseline justify-between gap-4 border-t-2 border-[var(--print-accent)] pt-3">
            <span className="text-[12px] font-semibold">{t('sales.totalWithTax', 'Total with tax')}</span>
            <span className="text-[24px] font-semibold tracking-[-0.02em] text-[var(--print-accent)] tabular-nums">
              {formatCents(document.total_cents, currency)}
            </span>
          </div>
        </div>
      </section>

      <NotesAndTerms
        notes={document.notes}
        terms={theme.footer_notes.trim() || t('sales.scopeNetGross', 'Prices shown both without and with tax, at the rates in force today.')}
        termsLabel={t('sales.scope', 'Scope and conditions')}
        className={cn('mt-8', `${D}mt-5`)}
      />
      {theme.show_signature ? <SignatureRow /> : null}

      <footer className="mt-auto flex items-end justify-between gap-8 border-t border-[#e2e8f0] pt-4 text-[9.5px] text-[#94a3b8]">
        <span className="font-medium text-[#64748b]">
          {t('sales.quotationFooter', 'This is a quotation, not a tax invoice.')}
        </span>
        <PageMark document={document} />
      </footer>
    </SheetFrame>
  )
}

/* ------------------------------------------------------------------ Proforma: the quotation's sibling */

function ProformaSheet({ document, company, currency, lines, issued, theme, logoSrc }: SheetProps) {
  const display = saleDisplayStatus(document)
  const units = lines.reduce((sum, line) => sum + line.quantity, 0)
  const settled = Math.min(document.settled_cents ?? 0, document.total_cents)
  const balance = Math.max(0, document.total_cents - settled)
  const paidShare = document.total_cents > 0 ? Math.round((settled / document.total_cents) * 100) : 0
  const place = companyPlace(company)
  const contact = companyContact(company)
  const attn = clientAttn(document)
  const id = taxId(document)

  const columns: Column[] = [
    { key: 'qty', label: t('sales.qty', 'Qty'), width: 60, render: (line) => qtyText(line.quantity) },
    { key: 'price', label: t('sales.unitPrice', 'Unit price'), width: 104, render: (line) => formatCents(line.unit_price, currency) },
    {
      key: 'amount',
      label: t('sales.amount', 'Amount'),
      width: 116,
      className: 'font-semibold text-[#0f172a]',
      render: (line) => formatCents(line.total_cents, currency),
    },
  ]

  const stats: { label: string; value: ReactNode; accent?: boolean }[] = [
    { label: t('sales.date', 'Date'), value: issued },
    { label: t('sales.units', 'Units'), value: `${qtyText(units)} · ${lines.length} ${lines.length === 1 ? t('sales.lineOne', 'line') : t('sales.lineMany', 'lines')}` },
    { label: t('sales.status', 'Status'), value: <StatusBadge status={display} /> },
    { label: t('sales.total', 'Total'), value: formatCents(document.total_cents, currency), accent: true },
  ]

  const clientFacts = [
    { label: 'N.I.F / N.I.E', value: id },
    { label: t('sales.phone', 'Phone'), value: document.client_phone },
    { label: t('sales.attn', 'Attn.'), value: attn },
  ].filter((fact) => fact.value)

  return (
    <SheetFrame theme={theme} voided={display === 'voided'} lineCount={lines.length} denseAfter={6} className={cn('px-14 pt-12 pb-10', `${D}pt-9 ${D}pb-8`)}>
      <header className="flex items-start justify-between gap-10">
        <div className="min-w-0">
          {theme.show_logo ? (
            <div className="mb-2.5">
              <LogoMark company={company} logoSrc={logoSrc} show size={lines.length > 6 ? 44 : 54} imageSize={lines.length > 6 ? 56 : 72} />
            </div>
          ) : null}
          <p className="m-0 text-[15px] font-semibold tracking-[-0.01em]">{company?.name}</p>
          <p className="mt-1 mb-0 text-[10.5px] leading-[1.65] text-[#64748b]">
            {[...place, contact].filter(Boolean).map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <h1 className="m-0 text-[44px] leading-none font-light tracking-[-0.035em] text-[#0f172a] group-data-[dense=true]:text-[34px]">
            {t('sales.proformaTitle', 'Proforma')}
          </h1>
          <p className="mt-2.5 mb-0 text-[12px] font-medium text-[#64748b] tabular-nums">{document.number}</p>
          <span aria-hidden="true" className="mt-3.5 ml-auto block h-1 w-10 rounded-full bg-[var(--print-accent)]" />
        </div>
      </header>

      <section className={cn('mt-9 grid grid-cols-4 rounded-xl bg-[var(--print-soft)] px-2 py-4', `${D}mt-6 ${D}py-3`)}>
        {stats.map((stat, index) => (
          <div key={stat.label} className={cn('px-4', index > 0 && 'border-l border-[var(--print-border)]')}>
            <Label>{stat.label}</Label>
            <div
              className={cn(
                'mt-1.5 tabular-nums',
                stat.accent ? 'text-[17px] font-semibold text-[var(--print-accent)]' : 'text-[12.5px] font-medium',
              )}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </section>

      <section className={cn('mt-8 flex items-start justify-between gap-8 border-l-[3px] border-[var(--print-accent)] pl-4', `${D}mt-5`)}>
        <div className="min-w-0">
          <Label>{t('sales.preparedFor', 'Prepared for')}</Label>
          <p className="mt-2 mb-0 text-[15px] font-semibold text-[#0f172a]">{clientTitle(document)}</p>
          {document.client_address ? (
            <p className="mt-1 mb-0 text-[11px] leading-[1.6] text-[#475569]">{document.client_address}</p>
          ) : null}
        </div>
        {clientFacts.length > 0 ? (
          <dl className="m-0 flex shrink-0 gap-8 text-[11px]">
            {clientFacts.map((fact) => (
              <div key={fact.label}>
                <dt className="text-[9.5px] text-[#64748b]">{fact.label}</dt>
                <dd className="m-0 mt-1 font-medium text-[#0f172a] tabular-nums">{fact.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </section>

      <ItemsTable lines={lines} columns={columns} variant="light" className={cn('mt-8', `${D}mt-5`)} />

      <section className={cn('mt-6 flex items-start justify-between gap-10', `${D}mt-4`)}>
        <p className="m-0 max-w-[300px] text-[10px] leading-[1.7] text-[#94a3b8]">
          {t(
            'sales.proformaCaption',
            'Prices are the amounts agreed with the customer for this shipment. Taxes are not calculated on this document.',
          )}
        </p>
        <div className="w-[280px] shrink-0 text-[11.5px]">
          <div className="flex items-baseline justify-between gap-4 border-t-2 border-[var(--print-accent)] pt-3">
            <span className="text-[12px] font-semibold">{t('sales.total', 'Total')}</span>
            <span className="text-[24px] font-semibold tracking-[-0.02em] text-[var(--print-accent)] tabular-nums">
              {formatCents(document.total_cents, currency)}
            </span>
          </div>
          {settled > 0 ? (
            <div className="mt-3.5">
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--print-tint)]">
                <span className="block h-full rounded-full bg-[var(--print-accent)]" style={{ width: `${paidShare}%` }} />
              </div>
              <div className="mt-2.5 flex items-baseline justify-between gap-4">
                <span className="text-[#64748b]">
                  {t('sales.paidToDate', 'Paid to date')} · {paidShare}%
                </span>
                <span className="tabular-nums">{formatCents(settled, currency)}</span>
              </div>
              <div className="mt-1.5 flex items-baseline justify-between gap-4">
                <span className="font-semibold">{t('sales.balanceDue', 'Balance due')}</span>
                <span className="font-semibold tabular-nums">{formatCents(balance, currency)}</span>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <NotesAndTerms notes={document.notes} terms={theme.footer_notes} className={cn('mt-9', `${D}mt-5`)} />
      {theme.show_signature ? <SignatureRow /> : null}

      <footer className="mt-auto flex items-end justify-between gap-8 border-t border-[#e2e8f0] pt-4 text-[9.5px] text-[#94a3b8]">
        <span className="font-medium text-[#64748b]">{t('sales.proformaTag', 'Not a tax invoice')}</span>
        <PageMark document={document} />
      </footer>
    </SheetFrame>
  )
}

/* ------------------------------------------------------------------ Albarán: a plain delivery slip */

/** Deliberately carries nothing of the issuing company: no name, address, email or logo. */
function AlbaranSheet({ document, currency, lines, issued, theme }: SheetProps) {
  const display = saleDisplayStatus(document)
  const units = lines.reduce((sum, line) => sum + line.quantity, 0)
  const attn = clientAttn(document)
  const id = taxId(document)

  const columns: Column[] = [
    {
      key: 'qty',
      label: t('sales.qty', 'Qty'),
      width: 60,
      className: 'font-bold text-[#0f172a]',
      render: (line) => qtyText(line.quantity),
    },
    { key: 'price', label: t('sales.unitPrice', 'Unit price'), width: 92, render: (line) => formatCents(line.unit_price, currency) },
    ...discountColumn(lines, 56),
    {
      key: 'amount',
      label: t('sales.amount', 'Amount'),
      width: 100,
      className: 'font-medium text-[#0f172a]',
      render: (line) => formatCents(grossOf(line).total, currency),
    },
  ]

  const field = (label: string, value: ReactNode) => (
    <div className="flex items-baseline gap-3 border-b border-dashed border-[#94a3b8] py-2">
      <span className="w-[92px] shrink-0 text-[10px] font-semibold tracking-[0.06em] text-[#64748b] uppercase">{label}</span>
      <span className="min-w-0 flex-1 text-[12px] font-medium text-[#0f172a]">{value || ' '}</span>
    </div>
  )

  return (
    <SheetFrame theme={theme} voided={display === 'voided'} lineCount={lines.length} className={cn('px-14 pt-14 pb-10', `${D}pt-11 ${D}pb-8`)}>
      <header className="flex items-start justify-between gap-8">
        <div>
          <h1 className="m-0 text-[46px] leading-[0.9] font-black tracking-[-0.04em] text-[var(--print-accent)] uppercase">
            Albarán
          </h1>
          <p className="mt-2.5 mb-0 text-[11px] font-semibold tracking-[0.24em] text-[#475569] uppercase">
            {t('sales.typeAlbaran', 'Delivery note')}
          </p>
        </div>
        <div className="grid shrink-0 grid-cols-2 overflow-hidden rounded-md border-2 border-[#0f172a] text-center">
          <div className="border-r-2 border-[#0f172a] px-5 py-2.5">
            <p className="m-0 text-[9px] font-semibold tracking-[0.1em] text-[#64748b] uppercase">{t('sales.number', 'No.')}</p>
            <p className="mt-1 mb-0 text-[15px] font-bold tabular-nums">{document.number}</p>
          </div>
          <div className="px-5 py-2.5">
            <p className="m-0 text-[9px] font-semibold tracking-[0.1em] text-[#64748b] uppercase">{t('sales.date', 'Date')}</p>
            <p className="mt-1 mb-0 text-[15px] font-bold tabular-nums">{issued}</p>
          </div>
        </div>
      </header>

      <section className={cn('mt-10', `${D}mt-6`)}>
        <Label className="text-[#0f172a]">{t('sales.deliverTo', 'Deliver to')}</Label>
        <div className="mt-1.5">
          {field(t('sales.clientName', 'Name'), clientTitle(document))}
          {attn ? field(t('sales.attn', 'Attn.'), attn) : null}
          <div className="grid grid-cols-2 gap-8">
            {field('N.I.F / N.I.E', id)}
            {field(t('sales.phone', 'Phone'), document.client_phone)}
          </div>
          {document.client_address ? field(t('sales.clientAddress', 'Address'), document.client_address) : null}
        </div>
      </section>

      <ItemsTable lines={lines} columns={columns} variant="slip" className={cn('mt-9', `${D}mt-6`)} />

      <section className={cn('mt-6 flex items-start justify-between gap-10', `${D}mt-4`)}>
        <p className="m-0 text-[11px] text-[#475569]">
          <span className="font-bold text-[#0f172a] tabular-nums">{qtyText(units)}</span>{' '}
          {t('sales.unitsIn', 'units in')} <span className="font-bold text-[#0f172a] tabular-nums">{lines.length}</span>{' '}
          {lines.length === 1 ? t('sales.lineOne', 'line') : t('sales.lineMany', 'lines')}
        </p>
        <div className="w-[260px] shrink-0 text-[11.5px]">
          <TotalRows rows={discountRows(document, currency)} />
          <div className="mt-1.5 flex items-baseline justify-between gap-4 border-t-2 border-[#0f172a] pt-2.5">
            <span className="text-[12px] font-bold uppercase tracking-[0.06em]">{t('sales.totalNet', 'Total (net)')}</span>
            <span className="text-[20px] font-bold tabular-nums">{formatCents(document.total_cents, currency)}</span>
          </div>
        </div>
      </section>

      <NotesAndTerms notes={document.notes} terms={theme.footer_notes} className={cn('mt-9', `${D}mt-6`)} />
      {theme.show_signature ? <SignatureRow dashed /> : null}

      <footer className="mt-auto flex items-center justify-between gap-6 border-t-2 border-dashed border-[#94a3b8] pt-3 text-[9.5px] text-[#94a3b8]">
        <span>{t('sales.albaranFooter', 'Keep this slip with the goods.')}</span>
        <PageMark document={document} />
      </footer>
    </SheetFrame>
  )
}

export function PrintSheetView({
  document,
  company,
  currency,
  theme,
  logoSrc,
}: {
  document: SaleDocument
  company: Company | null
  currency: string
  theme: PrintTemplate
  logoSrc: string | null
}) {
  const lines = document.lines ?? []
  const issued = formatDate(document.issued_at)
  const props = { document, company, currency, lines, issued, theme, logoSrc }

  switch (document.type) {
    case 'albaran':
      return <AlbaranSheet {...props} />
    case 'quotation':
      return <QuotationSheet {...props} />
    case 'proforma':
      return <ProformaSheet {...props} />
    default:
      return <InvoiceSheet {...props} />
  }
}

export function PrintSheet({ document, company, currency, theme, logoSrc }: PrintSheetProps) {
  const query = useQuery({
    queryKey: ['app', 'print-templates'],
    queryFn: getPrintTemplates,
    enabled: theme === undefined,
  })
  const applied = theme ?? pickPrintTemplate(query.data?.templates, document.type)
  const waiting = theme === undefined && query.isPending
  const logoUrl = company?.logo_url ?? query.data?.logo_url ?? null
  const blobQuery = useQuery({
    queryKey: ['app', 'print-logo', logoUrl],
    queryFn: () => loadLogoBlob(logoUrl),
    enabled:
      !waiting && logoSrc === undefined && document.type !== 'albaran' && Boolean(logoUrl) && applied.show_logo,
  })

  useEffect(() => {
    if (waiting) return
    ensurePrintFonts(applied.font_key)
  }, [waiting, applied.font_key])

  if (waiting) {
    return (
      <article
        id="printable-invoice"
        className="relative mx-auto h-[1123px] w-[794px] animate-pulse bg-white shadow-[0_1px_4px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/80"
      />
    )
  }

  const src =
    document.type === 'albaran' ? null : logoSrc !== undefined ? logoSrc : (blobQuery.data ?? null)

  return (
    <PrintSheetView
      document={document}
      company={company}
      currency={currency}
      theme={applied}
      logoSrc={src}
    />
  )
}
