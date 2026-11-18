import { jsPDF } from 'jspdf'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import type { CSSProperties, ReactNode } from 'react'
import { t } from '../i18n'
import { loadLogoBlob } from '../services/printables'
import type { Company } from '../types/module01'
import type { LedgerEntry, LedgerPayment } from '../types/ledger'
import { A4_CSS_HEIGHT, A4_CSS_WIDTH, captureSheetDataUrl, triggerBlobDownload } from './downloadSheetImage'
import { downloadFileName, fileDate } from './fileName'
import { formatDate } from './format'
import { formatCents } from './money'
import { parseIso } from './reportAnalytics'

/* ------------------------------------------------------------------------------------------------ the numbers */

export type PaymentStep = {
  payment: LedgerPayment
  /** 1, 2, 3...: the order of the payments on this entry. */
  position: number
  /** PAY-{entry number}-{position}: the number written on that payment's receipt. */
  number: string
  /** What had been paid once this payment was in, and what was still owed. */
  paidAfterCents: number
  owedAfterCents: number
  /** True when this payment is the one that settled the entry. */
  closes: boolean
}

/** The entry's payments in the order they were made (by day, then by when they were written). */
export function orderedPayments(entry: LedgerEntry): LedgerPayment[] {
  return [...(entry.payments ?? [])].sort((a, b) => (a.paid_on === b.paid_on ? a.id - b.id : a.paid_on < b.paid_on ? -1 : 1))
}

/** Each payment with its receipt number and the balance right after it. */
export function paymentSteps(entry: LedgerEntry): PaymentStep[] {
  let paid = 0
  return orderedPayments(entry).map((payment, index) => {
    paid += payment.amount_cents
    const owed = Math.max(0, entry.amount_cents - paid)
    return {
      payment,
      position: index + 1,
      number: `PAY-${entry.number}-${index + 1}`,
      paidAfterCents: paid,
      owedAfterCents: owed,
      closes: owed === 0,
    }
  })
}

const showDate = (day: string) => formatDate(parseIso(day))

/* ------------------------------------------------------------------------------------------------ the sheets */

/*
 * A plain, business-like sheet in the manner of a printed invoice: white paper, dark text, hairline rules, the company
 * colour used only as an accent (the title and one rule). Everything is laid out in fixed A4 pixels.
 */

const INK = '#111827'
const BODY = '#374151'
const MUTED = '#6b7280'
const RULE = '#d1d5db'
const HAIR = '#e5e7eb'
const ZEBRA = '#f9fafb'
const HEAD_BG = '#f3f4f6'
const PAID = '#15803d'
const DUE = '#b91c1c'
const FONT = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
const SIDE = 56

type Style = { brand: string; currency: string; company: Company | null; logo: string | null }

const caption: CSSProperties = { fontSize: 9, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: 1.1 }
const cellPad = '9px 10px'

/** "Paid in full" / "Partially paid": a small outlined tag, like the status stamp on an invoice. */
function StatusTag({ done }: { done: boolean }) {
  const color = done ? PAID : DUE
  return (
    <span style={{ display: 'inline-block', border: `1.5px solid ${color}`, color, borderRadius: 4, padding: '3px 10px', fontSize: 10, fontWeight: 800, letterSpacing: 1.4, textTransform: 'uppercase' }}>
      {done ? t('ledger.paidInFull', 'Paid in full') : t('ledger.partiallyPaid', 'Partially paid')}
    </span>
  )
}

/** The letterhead: the company on the left; the document name, its numbers and its status on the right. */
function Letterhead({ style, title, meta, done }: { style: Style; title: string; meta: { label: string; value: string }[]; done: boolean }) {
  const company = style.company
  const address = [company?.address, [company?.postal_code, company?.city].filter(Boolean).join(' '), company?.country].filter(Boolean).join(', ')
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 32 }}>
      <div style={{ minWidth: 0, maxWidth: 360 }}>
        {style.logo ? <img src={style.logo} alt="" style={{ display: 'block', maxHeight: 60, maxWidth: 170, objectFit: 'contain', marginBottom: 12 }} /> : null}
        <div style={{ fontSize: 17, fontWeight: 800, color: INK }}>{company?.name ?? ''}</div>
        <div style={{ marginTop: 4, fontSize: 11, lineHeight: 1.6, color: MUTED }}>
          {company?.tax_id ? <div>{company.tax_id}</div> : null}
          {address ? <div>{address}</div> : null}
          {[company?.phone, company?.email].filter(Boolean).length > 0 ? <div>{[company?.phone, company?.email].filter(Boolean).join('  ·  ')}</div> : null}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 24, fontWeight: 300, letterSpacing: 3, color: style.brand, textTransform: 'uppercase' }}>{title}</div>
        <table style={{ marginTop: 12, marginLeft: 'auto', borderCollapse: 'collapse', fontSize: 11.5 }}>
          <tbody>
            {meta.map((row) => (
              <tr key={row.label}>
                <td style={{ padding: '2px 14px 2px 0', color: MUTED, textAlign: 'right' }}>{row.label}</td>
                <td style={{ padding: '2px 0', fontWeight: 700, color: INK, textAlign: 'right' }}>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 12 }}>
          <StatusTag done={done} />
        </div>
      </div>
    </div>
  )
}

/** Payer, payee and what the money was for, in three columns between two rules. */
function Parties({ entry, style }: { entry: LedgerEntry; style: Style }) {
  const column = (title: string, body: ReactNode, flex = 1) => (
    <div style={{ flex, minWidth: 0 }}>
      <div style={caption}>{title}</div>
      <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.55, color: BODY }}>{body}</div>
    </div>
  )
  return (
    <div style={{ marginTop: 28, borderTop: `2px solid ${style.brand}`, borderBottom: `1px solid ${RULE}`, padding: '16px 0', display: 'flex', gap: 28 }}>
      {column(t('ledger.paidBy', 'Paid by'), <div style={{ fontWeight: 700, color: INK }}>{style.company?.name ?? ''}</div>)}
      {column(t('ledger.paidTo', 'Paid to'), <div style={{ fontWeight: 700, color: INK }}>{entry.supplier_name}</div>)}
      {column(
        t('ledger.forEntry', 'For'),
        <>
          <div style={{ fontWeight: 700, color: INK }}>
            {entry.number} · {showDate(entry.bill_date)}
          </div>
          <div style={{ wordBreak: 'break-word' }}>{entry.description}</div>
          {entry.reference ? (
            <div>
              {t('ledger.supplierInvoice', 'Supplier invoice')}: {entry.reference}
            </div>
          ) : null}
          {entry.iva ? (
            <div>
              {t('ledger.ivaLine', 'Base {base} + IVA {percent}% {iva}', { base: formatCents(entry.iva.base_cents, style.currency), percent: entry.iva.percent, iva: formatCents(entry.iva.iva_cents, style.currency) })}
            </div>
          ) : null}
        </>,
        1.6,
      )}
    </div>
  )
}

/** Base and IVA of the entry, the way a purchase invoice shows its tax: shown only when the entry has IVA. */
function IvaRows(entry: LedgerEntry): { label: string; value: number }[] {
  if (!entry.iva) return []
  return [
    { label: t('purchases.baseAmount', 'Base (before IVA)'), value: entry.iva.base_cents },
    { label: `${t('purchases.ivaAmount', 'IVA')} ${entry.iva.percent}%`, value: entry.iva.iva_cents },
  ]
}

/** The figures on the right, as an invoice ends: each line, then the one that matters, between two rules. */
function Totals({ rows, last, style }: { rows: { label: string; value: number; color?: string }[]; last: { label: string; value: number; color: string }; style: Style }) {
  const money = (cents: number) => formatCents(cents, style.currency)
  return (
    <table style={{ marginTop: 18, marginLeft: 'auto', width: 300, borderCollapse: 'collapse', fontSize: 12.5 }}>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <td style={{ padding: '6px 10px', color: MUTED }}>{row.label}</td>
            <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, color: row.color ?? INK }}>{money(row.value)}</td>
          </tr>
        ))}
        <tr>
          <td style={{ padding: '10px', borderTop: `1px solid ${INK}`, borderBottom: `3px double ${INK}`, fontWeight: 800, color: INK }}>{last.label}</td>
          <td style={{ padding: '10px', borderTop: `1px solid ${INK}`, borderBottom: `3px double ${INK}`, textAlign: 'right', fontSize: 15, fontWeight: 800, color: last.color }}>{money(last.value)}</td>
        </tr>
      </tbody>
    </table>
  )
}

/** The page itself: margins, the content, and the small print at the foot. */
function Page({ children, foot, right }: { children: ReactNode; foot: string; right: string }) {
  return (
    <div style={{ width: A4_CSS_WIDTH, height: A4_CSS_HEIGHT, boxSizing: 'border-box', background: '#fff', color: INK, fontFamily: FONT, padding: `48px ${SIDE}px 0`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>{children}</div>
      <div style={{ borderTop: `1px solid ${HAIR}`, padding: '10px 0 22px', display: 'flex', justifyContent: 'space-between', gap: 20, fontSize: 9.5, color: MUTED }}>
        <span>{foot}</span>
        <span style={{ flexShrink: 0 }}>{right}</span>
      </div>
    </div>
  )
}

const th = (align: 'left' | 'right', width: string): CSSProperties => ({
  padding: cellPad,
  width,
  textAlign: align,
  background: HEAD_BG,
  color: BODY,
  fontSize: 9.5,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 0.8,
  borderTop: `1px solid ${RULE}`,
  borderBottom: `1px solid ${RULE}`,
})

function Receipt({ entry, step, style }: { entry: LedgerEntry; step: PaymentStep; style: Style }) {
  const money = (cents: number) => formatCents(cents, style.currency)
  const payment = step.payment
  const before = step.paidAfterCents - payment.amount_cents

  return (
    <Page
      foot={t('ledger.receiptFoot', 'This receipt confirms the payment above to {supplier}.', { supplier: entry.supplier_name })}
      right={`${t('reports.generated', 'Generated')} ${formatDate(new Date())}`}
    >
      <Letterhead
        style={style}
        title={t('ledger.receiptTitle', 'Payment receipt')}
        done={step.closes}
        meta={[
          { label: t('ledger.receiptNumber', 'Receipt no.'), value: step.number },
          { label: t('ledger.paymentDate', 'Date'), value: showDate(payment.paid_on) },
          { label: t('ledger.entryNumber', 'Entry no.'), value: entry.number },
        ]}
      />

      <Parties entry={entry} style={style} />

      <table style={{ marginTop: 26, width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed' }}>
        <thead>
          <tr>
            <th style={th('left', '46%')}>{t('ledger.receiptLine', 'Description')}</th>
            <th style={th('left', '20%')}>{t('ledger.paymentMethod', 'Paid with')}</th>
            <th style={th('left', '16%')}>{t('ledger.paymentDate', 'Date')}</th>
            <th style={th('right', '18%')}>{t('ledger.receiptPaid', 'Amount paid')}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: '12px 10px', borderBottom: `1px solid ${HAIR}`, verticalAlign: 'top' }}>
              <div style={{ fontWeight: 700, color: INK }}>
                {t('ledger.receiptPaymentOf', 'Payment {position} towards {entry}', { position: step.position, entry: entry.number })}
              </div>
              {payment.note ? <div style={{ marginTop: 3, color: MUTED }}>{payment.note}</div> : null}
            </td>
            <td style={{ padding: '12px 10px', borderBottom: `1px solid ${HAIR}`, verticalAlign: 'top', color: BODY }}>{payment.payment_method_name ?? '—'}</td>
            <td style={{ padding: '12px 10px', borderBottom: `1px solid ${HAIR}`, verticalAlign: 'top', color: BODY }}>{showDate(payment.paid_on)}</td>
            <td style={{ padding: '12px 10px', borderBottom: `1px solid ${HAIR}`, verticalAlign: 'top', textAlign: 'right', fontWeight: 800, color: INK }}>{money(payment.amount_cents)}</td>
          </tr>
        </tbody>
      </table>

      <Totals
        style={style}
        rows={[
          ...IvaRows(entry),
          { label: entry.iva ? t('ledger.entryTotalWithIva', 'Entry total (IVA incl.)') : t('ledger.entryTotal', 'Entry total'), value: entry.amount_cents },
          { label: t('ledger.paidBefore', 'Paid before'), value: before },
          { label: t('ledger.thisPayment', 'This payment'), value: payment.amount_cents, color: PAID },
          { label: t('ledger.receiptPaidSoFar', 'Paid so far'), value: step.paidAfterCents },
        ]}
        last={{ label: t('ledger.balanceDue', 'Balance due'), value: step.owedAfterCents, color: step.owedAfterCents > 0 ? DUE : INK }}
      />

      {step.closes ? (
        <p style={{ marginTop: 16, textAlign: 'right', fontSize: 11.5, color: PAID, fontWeight: 600 }}>{t('ledger.closesNote', 'With this payment the entry is settled in full.')}</p>
      ) : null}

      <div style={{ marginTop: 'auto', paddingBottom: 26, display: 'flex', gap: 70 }}>
        {[
          { label: t('ledger.paidBy', 'Paid by'), name: payment.created_by_name ?? style.company?.name ?? '' },
          { label: t('ledger.receivedBy', 'Received by (supplier)'), name: entry.supplier_name },
        ].map((sign) => (
          <div key={sign.label} style={{ flex: 1 }}>
            <div style={{ height: 46 }} />
            <div style={{ borderTop: `1px solid ${BODY}`, paddingTop: 6, fontSize: 10.5, color: MUTED }}>
              <div style={{ fontWeight: 700, color: BODY }}>{sign.label}</div>
              <div>{sign.name}</div>
            </div>
          </div>
        ))}
      </div>
    </Page>
  )
}

/** How many payment rows fit under the header on the first sheet, and on each one after it. */
const ROWS_FIRST = 14
const ROWS_NEXT = 30

function Statement({ entry, steps, page, pages, style }: { entry: LedgerEntry; steps: PaymentStep[]; page: number; pages: number; style: Style }) {
  const money = (cents: number) => formatCents(cents, style.currency)
  const first = page === 0
  const from = first ? 0 : ROWS_FIRST + (page - 1) * ROWS_NEXT
  const rows = steps.slice(from, from + (first ? ROWS_FIRST : ROWS_NEXT))
  const last = page === pages - 1
  const done = entry.owed_cents === 0 && entry.amount_cents > 0
  const closing = steps.find((step) => step.closes)
  const td = (align: 'left' | 'right', extra: CSSProperties = {}): CSSProperties => ({ padding: cellPad, textAlign: align, borderBottom: `1px solid ${HAIR}`, color: BODY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...extra })

  return (
    <Page
      foot={[style.company?.name, entry.supplier_name, entry.number].filter(Boolean).join('  ·  ')}
      right={t('reports.pageOf', 'Page {page} of {total}', { page: page + 1, total: pages })}
    >
      {first ? (
        <>
          <Letterhead
            style={style}
            title={t('ledger.statementTitle', 'Payment statement')}
            done={done}
            meta={[
              { label: t('ledger.entryNumber', 'Entry no.'), value: entry.number },
              { label: t('ledger.statementDate', 'Statement date'), value: formatDate(new Date()) },
              { label: t('ledger.paymentsCount', 'Payments'), value: String(steps.length) },
            ]}
          />
          <Parties entry={entry} style={style} />
        </>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: `2px solid ${style.brand}`, paddingBottom: 10 }}>
          <span style={{ fontSize: 16, fontWeight: 300, letterSpacing: 2, color: style.brand, textTransform: 'uppercase' }}>{t('ledger.statementTitle', 'Payment statement')}</span>
          <span style={{ fontSize: 12, fontWeight: 700 }}>{entry.number}</span>
        </div>
      )}

      <table style={{ marginTop: first ? 26 : 18, width: '100%', borderCollapse: 'collapse', fontSize: 11.5, tableLayout: 'fixed' }}>
        <thead>
          <tr>
            <th style={th('left', '5%')}>#</th>
            <th style={th('left', '19%')}>{t('ledger.receiptNumber', 'Receipt no.')}</th>
            <th style={th('left', '12%')}>{t('ledger.paymentDate', 'Date')}</th>
            <th style={th('left', '16%')}>{t('ledger.paymentMethod', 'Paid with')}</th>
            <th style={th('left', '16%')}>{t('ledger.paymentNote', 'Note (optional)')}</th>
            <th style={th('right', '15%')}>{t('ledger.paid', 'Paid')}</th>
            <th style={th('right', '17%')}>{t('ledger.balanceDue', 'Balance due')}</th>
          </tr>
        </thead>
        <tbody>
          {first ? (
            <tr>
              <td style={td('left')} />
              <td style={td('left', { color: MUTED })} colSpan={4}>
                {t('ledger.openingRow', 'Entry recorded on {date}', { date: showDate(entry.bill_date) })}
              </td>
              <td style={td('right')} />
              <td style={td('right', { fontWeight: 700, color: INK })}>{money(entry.amount_cents)}</td>
            </tr>
          ) : null}
          {rows.map((step, index) => (
            <tr key={step.payment.id} style={{ background: (from + index) % 2 ? ZEBRA : '#fff' }}>
              <td style={td('left', { color: MUTED })}>{step.position}</td>
              <td style={td('left', { fontWeight: 600, color: INK })}>{step.number}</td>
              <td style={td('left')}>{showDate(step.payment.paid_on)}</td>
              <td style={td('left')}>{step.payment.payment_method_name ?? '—'}</td>
              <td style={td('left', { color: MUTED })}>{step.payment.note ?? ''}</td>
              <td style={td('right', { fontWeight: 700, color: INK })}>{money(step.payment.amount_cents)}</td>
              <td style={td('right', { fontWeight: 600, color: step.owedAfterCents > 0 ? DUE : PAID })}>{money(step.owedAfterCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {last ? (
        <>
          <Totals
            style={style}
            rows={[
              ...IvaRows(entry),
              { label: entry.iva ? t('ledger.entryTotalWithIva', 'Entry total (IVA incl.)') : t('ledger.entryTotal', 'Entry total'), value: entry.amount_cents },
              { label: t('ledger.totalPaid', 'Total paid'), value: entry.paid_cents, color: PAID },
            ]}
            last={{ label: t('ledger.balanceDue', 'Balance due'), value: entry.owed_cents, color: entry.owed_cents > 0 ? DUE : INK }}
          />
          <p style={{ marginTop: 16, textAlign: 'right', fontSize: 11.5, fontWeight: 600, color: done ? PAID : DUE }}>
            {done && closing
              ? t('ledger.settledOnLong', 'Settled in full on {date} with {count} payments.', { date: showDate(closing.payment.paid_on), count: steps.length })
              : t('ledger.stillDueLong', '{amount} is still due on this entry.', { amount: money(entry.owed_cents) })}
          </p>
        </>
      ) : null}
    </Page>
  )
}

/* ------------------------------------------------------------------------------------------------ the files */

function waitForPaint(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
}

/** A slip ready to be looked at or saved: its pages as pictures (A4), its name and its file name. */
export type Slip = { title: string; filename: string; pages: string[] }

/** Draws each sheet off screen at A4 size and photographs it: one picture per page. */
async function renderPages(sheets: ReactNode[]): Promise<string[]> {
  const pages: string[] = []

  for (const sheet of sheets) {
    const host = window.document.createElement('div')
    host.setAttribute('aria-hidden', 'true')
    host.style.cssText = `position:fixed;left:0;top:0;width:${A4_CSS_WIDTH}px;height:${A4_CSS_HEIGHT}px;overflow:hidden;pointer-events:none;z-index:-1;`
    window.document.body.appendChild(host)
    const root = createRoot(host)

    try {
      flushSync(() => root.render(sheet))
      await waitForPaint()
      pages.push(await captureSheetDataUrl(host.firstElementChild as HTMLElement))
    } finally {
      root.unmount()
      host.remove()
    }
  }

  return pages
}

/** Saves a slip as a PDF file, one A4 page per picture. */
export function downloadSlip(slip: Slip): void {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
  slip.pages.forEach((page, index) => {
    if (index > 0) pdf.addPage()
    pdf.addImage(page, 'PNG', 0, 0, 210, 297)
  })
  triggerBlobDownload(slip.filename, pdf.output('blob'))
}

async function styleFor(company: Company | null, currency: string, brand: string): Promise<Style> {
  const logo = await loadLogoBlob(company?.logo_url ?? null).catch(() => null)
  return { brand, currency, company, logo }
}

type Context = { company: Company | null; currency: string; brand: string }

/** One payment's receipt. */
export async function buildPaymentReceipt(entry: LedgerEntry, paymentId: number, context: Context): Promise<Slip> {
  const step = paymentSteps(entry).find((item) => item.payment.id === paymentId)
  if (!step) throw new Error(t('ledger.receiptMissing', 'That payment is not on this entry any more.'))

  const style = await styleFor(context.company, context.currency, context.brand)
  return {
    title: `${t('ledger.receiptTitle', 'Payment receipt')} ${step.number}`,
    filename: downloadFileName([context.company?.name, t('ledger.receiptTitle', 'Payment receipt'), step.number, fileDate()], 'pdf'),
    pages: await renderPages([<Receipt key="r" entry={entry} step={step} style={style} />]),
  }
}

/** Everything paid against one entry: each payment with its date, the running balance, and whether it is now complete. */
export async function buildPaymentStatement(entry: LedgerEntry, context: Context): Promise<Slip> {
  const steps = paymentSteps(entry)
  const extra = Math.max(0, steps.length - ROWS_FIRST)
  const pages = 1 + Math.ceil(extra / ROWS_NEXT)
  const style = await styleFor(context.company, context.currency, context.brand)

  return {
    title: `${t('ledger.statementTitle', 'Payment statement')} ${entry.number}`,
    filename: downloadFileName([context.company?.name, t('ledger.statementTitle', 'Payment statement'), entry.number, fileDate()], 'pdf'),
    pages: await renderPages(Array.from({ length: pages }, (_item, page) => <Statement key={page} entry={entry} steps={steps} page={page} pages={pages} style={style} />)),
  }
}
