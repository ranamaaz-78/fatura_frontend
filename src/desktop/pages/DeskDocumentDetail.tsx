import {
  ArrowLeft,
  Ban,
  CalendarClock,
  CalendarX2,
  CircleCheck,
  CreditCard,
  FileDown,
  FileOutput,
  FilePlus2,
  FileText,
  ImageDown,
  Loader2,
  MessageCircle,
  Pencil,
  Printer,
  Truck,
  Undo2,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ConfettiBurst } from '../../components/ui/ConfettiBurst'
import { intlLocale, t, tp } from '../../i18n'
import { cn } from '../../lib/cn'
import { downloadSaleDocumentSheet } from '../../lib/exportSaleSheet'
import { formatDate } from '../../lib/format'
import { formatCents } from '../../lib/money'
import { getErrorMessage } from '../../services/api'
import { typeLabel } from '../../pages/app/documentTypes'
import { PrintSheet } from '../../pages/app/printSheets'
import { DocumentDialogs, documentFlags, paymentLabel, useDocumentDetail } from '../../pages/app/useDocumentDetail'
import type { SaleDisplayStatus } from '../../types/sales'
import { identityFor } from '../ui/docIdentity'
import { Kbd, Pill, Shimmer, deskButtonClass, type PILL } from '../ui/kit'

/** The printed sheet is an A4 page at 96 dpi. */
const SHEET_WIDTH = 794

function statusTone(status: SaleDisplayStatus): keyof typeof PILL {
  if (status === 'voided') return 'voided'
  if (status === 'returned') return 'neutral'
  if (status === 'partial') return 'partial'
  return status === 'paid' ? 'paid' : 'pending'
}

/**
 * One document, laid out like a desk: the real printed sheet on the left (exactly what prints, PDFs and goes by
 * WhatsApp), and on the right its money, what happened to it, and what can be done next. Every action and dialog is the
 * website's own (useDocumentDetail).
 */
export default function DeskDocumentDetail() {
  const detail = useDocumentDetail()
  const { currency, company, can, push, query, exporting, setExporting, celebrate, setCelebrate, celebrateKey } = detail
  const document = query.data

  if (query.isPending || !document) {
    return (
      <div className="grid grid-cols-[1fr_380px] gap-6">
        <Shimmer className="h-[760px]" />
        <div className="space-y-4">
          <Shimmer className="h-40" />
          <Shimmer className="h-64" />
        </div>
      </div>
    )
  }

  const flags = documentFlags(document, can)
  const { rules, display, voided, canVoid, canUpdate, canPay, quoteExpired, openQuote, quoteDays, canSettle, settlements, returns } = flags
  const identity = identityFor(document.type)
  const Icon = identity.icon
  const credit = document.type === 'abono'

  function download(format: 'png' | 'pdf') {
    if (!document) return
    setExporting(format)
    void downloadSaleDocumentSheet(document, company ?? null, currency, format)
      .catch((error) => push({ tone: 'danger', title: getErrorMessage(error) }))
      .finally(() => setExporting(null))
  }

  const showsStatus = rules.settlesPayment || rules.settlesLines || voided
  const canRecordPayment = rules.settlesPayment && !voided && document.payment_status !== 'paid' && canPay

  // The main next step for this document, shown big; the rest sit under it.
  const primary: ReactNode[] = []
  const secondary: ReactNode[] = []

  if (canRecordPayment) {
    primary.push(
      <ActionButton key="pay" tone="primary" icon={CreditCard} busy={detail.payment.isPending} onClick={() => detail.setMethodOpen(true)}>
        {detail.payment.isPending ? t('sales.savingPayment', 'Saving...') : t('sales.recordPayment', 'Record payment')}
      </ActionButton>,
    )
  }
  if (canSettle) {
    primary.push(
      <ActionButton key="settle" tone="primary" icon={CreditCard} busy={detail.settling.isPending} onClick={() => detail.setSettleOpen(true)}>
        {detail.settling.isPending ? t('sales.savingPayment', 'Saving...') : t('sales.recordPayment', 'Record payment')}
      </ActionButton>,
    )
    if (!voided) {
      secondary.push(
        <ActionButton key="return" icon={Undo2} busy={detail.returning.isPending} onClick={() => detail.setReturnOpen(true)}>
          {t('sales.returnPieces', 'Return pieces')}
        </ActionButton>,
      )
    }
  }
  if (openQuote) {
    if (can('invoices.create')) {
      primary.push(
        <ActionButton key="to-invoice" tone="primary" icon={FileOutput} busy={detail.converting.isPending} onClick={() => detail.setConvertTarget('factura')}>
          {t('sales.convertInvoice', 'Convert to invoice')}
        </ActionButton>,
      )
    }
    if (can('delivery_notes.create')) {
      secondary.push(
        <ActionButton key="to-albaran" icon={Truck} busy={detail.converting.isPending} onClick={() => detail.setConvertTarget('albaran')}>
          {t('sales.convertAlbaran', 'Convert to delivery note')}
        </ActionButton>,
      )
    }
    if (canUpdate) {
      secondary.push(
        <ActionLink key="edit-quote" icon={Pencil} to={`/app/quotes/${document.id}/edit`}>
          {t('common.edit', 'Edit')}
        </ActionLink>,
      )
    }
  }
  if (document.can_invoice && can('invoices.create')) {
    primary.push(
      <ActionButton key="albaran-invoice" tone="primary" icon={FileOutput} busy={detail.invoiceFromAlbaran.isPending} onClick={() => detail.setAlbaranInvoiceOpen(true)}>
        {t('sales.convertInvoice', 'Convert to invoice')}
      </ActionButton>,
    )
  }
  if (document.type === 'albaran' && document.can_edit && canUpdate) {
    secondary.push(
      <ActionLink key="edit-albaran" icon={Pencil} to={`/app/delivery-notes/${document.id}/edit`}>
        {t('common.edit', 'Edit')}
      </ActionLink>,
    )
  }

  return (
    <div className="space-y-5 print:contents">
      <ConfettiBurst key={celebrateKey} play={celebrate} onDone={() => setCelebrate(false)} />

      {/* Which document, and the tools that work on every one. */}
      <section className="desk-glass no-print relative overflow-hidden">
        <span className={cn('absolute inset-y-0 left-0 w-1.5', identity.accent)} />
        <span aria-hidden className="pointer-events-none absolute -top-28 -right-10 h-64 w-64 rounded-full opacity-20 blur-3xl" style={{ background: identity.color }} />
        <div className="relative flex flex-wrap items-center justify-between gap-5 px-7 py-5">
          <div className="flex min-w-0 items-center gap-4">
            <span className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl', identity.chip)}>
              <Icon className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <Link to={rules.listPath} className="inline-flex items-center gap-1 text-[12px] font-semibold text-ink-muted transition hover:text-brand-600">
                <ArrowLeft className="h-3.5 w-3.5" />
                {typeLabel(document.type)}
              </Link>
              <div className="mt-0.5 flex flex-wrap items-center gap-2.5">
                <h1 className="desk-num text-[26px] leading-tight font-extrabold tracking-[-0.03em] text-ink">{document.number}</h1>
                {showsStatus ? <Pill tone={statusTone(display)}>{paymentLabel(display)}</Pill> : null}
                {!voided && document.payment_status === 'paid' && document.payment_method ? (
                  <Pill tone="neutral" dot={false}>
                    {document.payment_method.name}
                  </Pill>
                ) : null}
                {quoteExpired ? <Pill tone="voided">{t('sales.expired', 'Expired')}</Pill> : null}
              </div>
              <p className="mt-0.5 truncate text-[12px] text-ink-muted">
                {new Date(document.issued_at).toLocaleString(intlLocale())} · {document.client_name}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <ToolButton label={t('sales.print', 'Print')} hint="Ctrl P" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
            </ToolButton>
            <ToolButton label={t('sales.downloadPdf', 'Download PDF')} busy={exporting === 'pdf'} disabled={Boolean(exporting)} onClick={() => download('pdf')}>
              <FileDown className="h-4 w-4" />
            </ToolButton>
            <ToolButton label={t('sales.downloadImage', 'Download as image')} busy={exporting === 'png'} disabled={Boolean(exporting)} onClick={() => download('png')}>
              <ImageDown className="h-4 w-4" />
            </ToolButton>
            <button
              type="button"
              onClick={() => detail.setWhatsAppOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-500/12 px-3.5 text-[13px] font-semibold text-emerald-700 ring-1 ring-emerald-500/25 transition ring-inset hover:bg-emerald-500/20 app-dark:text-emerald-300"
            >
              <MessageCircle className="h-4 w-4" />
              {t('whatsapp.sendBtn', 'WhatsApp')}
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)_380px] items-start gap-6 print:contents">
        {/* The sheet itself, on the desk. */}
        <Paper accent={identity.color}>
          <PrintSheet document={document} company={company ?? null} currency={currency} />
        </Paper>

        <aside className="no-print sticky top-0 space-y-4">
          <section className={cn('desk-glass-strong overflow-hidden p-5', credit && 'ring-1 ring-rose-500/30')}>
            <p className="text-[11px] font-bold tracking-[0.12em] text-ink-muted uppercase">{t('sales.total', 'Total')}</p>
            <p className={cn('desk-num mt-1.5 text-[36px] leading-none font-extrabold', credit ? 'text-rose-600' : 'text-ink')}>
              {formatCents(document.total_cents, currency)}
            </p>
            <dl className="mt-4 space-y-1.5 text-[12px]">
              {rules.carriesTax ? (
                <>
                  <Figure label={t('desk.base', 'Taxable base')} value={formatCents(document.base_cents, currency)} />
                  <Figure label={t('reports.tax', 'Tax (IVA)')} value={formatCents(document.tax_cents, currency)} />
                </>
              ) : null}
              {document.discount_cents > 0 ? <Figure label={t('desk.discount', 'Discount')} value={`− ${formatCents(document.discount_cents, currency)}`} /> : null}
              {document.recargo_cents > 0 ? <Figure label={t('desk.recargo', 'Recargo')} value={formatCents(document.recargo_cents, currency)} /> : null}
              {rules.settlesLines ? <Figure label={t('sales.settled', 'Settled')} value={formatCents(document.settled_cents, currency)} strong /> : null}
            </dl>

            {primary.length > 0 || secondary.length > 0 ? (
              <div className="mt-5 space-y-2 border-t border-line/70 pt-4">
                {primary}
                {secondary.length > 0 ? <div className={cn('grid gap-2', secondary.length > 1 && 'grid-cols-2')}>{secondary}</div> : null}
              </div>
            ) : null}
          </section>

          {quoteExpired && document.expires_at ? (
            <Notice tone="rose" icon={CalendarX2} title={`${t('sales.quoteExpiredTitle', 'This quotation expired on')} ${formatDate(document.expires_at)}`}>
              <p>
                {t(
                  'sales.quoteExpiredBody',
                  'A quotation is open for one week. It can no longer be edited or turned into an invoice or delivery note, but you can still view, print and send it. Make a new quotation if the customer is still interested.',
                )}
              </p>
              <Link to="/app/invoices/new?type=quotation" className={deskButtonClass('primary', 'mt-3 h-9 text-[12px]')}>
                <FilePlus2 className="h-4 w-4" />
                {t('sales.newQuotation', 'New quotation')}
              </Link>
            </Notice>
          ) : null}

          {quoteDays !== null && document.expires_at ? (
            <Notice tone={quoteDays <= 2 ? 'amber' : 'brand'} icon={CalendarClock} title={`${t('sales.validUntil', 'Valid until')} ${formatDate(document.expires_at)}`}>
              <p>
                {quoteDays <= 0
                  ? t('sales.lastDay', 'last day to edit or convert')
                  : `${quoteDays} ${quoteDays === 1 ? t('sales.dayLeft', 'day left') : t('sales.daysLeft', 'days left')}`}
              </p>
            </Notice>
          ) : null}

          {/* What happened to it, oldest first. */}
          <section className="desk-glass p-5">
            <p className="text-[11px] font-bold tracking-[0.12em] text-ink-muted uppercase">{t('desk.history', 'History')}</p>
            <ol className="relative mt-4 space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-px before:bg-line">
              <Step icon={Icon} tone={identity.chip} title={t('desk.issued', 'Issued')} meta={new Date(document.issued_at).toLocaleString(intlLocale())} />

              {document.from_document ? (
                <Step icon={FileText} title={t('sales.fromAlbaran', 'Made from delivery note')} meta={t('sales.fromAlbaranNote', '· stock was already taken out by the delivery note')}>
                  <Link to={`/app/delivery-notes/${document.from_document.id}`} className="font-semibold text-brand-600">
                    {document.from_document.number}
                  </Link>
                </Step>
              ) : null}

              {document.from_proforma ? (
                <Step icon={FileText} title={t('sales.fromProforma', 'Made from a payment on proforma')} meta={t('sales.fromProformaNote', '· stock was already taken out by the proforma')}>
                  <Link to={`/app/proformas/${document.from_proforma.id}`} className="font-semibold text-brand-600">
                    {document.from_proforma.number}
                  </Link>
                </Step>
              ) : null}

              {settlements.map((row) => (
                <Step
                  key={`s-${row.id}`}
                  icon={CircleCheck}
                  tone="bg-emerald-500/14 text-emerald-600 app-dark:text-emerald-300"
                  title={row.payment_method?.name ?? t('sales.payment', 'Payment')}
                  meta={new Date(row.created_at).toLocaleString(intlLocale())}
                  amount={formatCents(row.total_cents, currency)}
                >
                  <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {rules.settlesLines && row.invoice && !row.invoice.is_voided ? (
                      <Link to={`/app/invoices/${row.invoice.id}`} className="inline-flex h-7 items-center gap-1 rounded-lg bg-emerald-500/12 px-2 text-[11px] font-semibold text-emerald-700 app-dark:text-emerald-300">
                        <FileText className="h-3.5 w-3.5" />
                        {row.invoice.number}
                      </Link>
                    ) : rules.settlesLines && can('invoices.create') ? (
                      <SmallAction disabled={detail.makeInvoice.isPending} onClick={() => detail.setInvoicing(row)}>
                        <FileText className="h-3.5 w-3.5" />
                        {t('sales.invoiceFromPayment', 'Create invoice')}
                      </SmallAction>
                    ) : null}
                    {rules.settlesLines && canPay && !(row.invoice && !row.invoice.is_voided) ? (
                      <SmallAction disabled={detail.editingQty.isPending} onClick={() => detail.setEditingSettlement(row)}>
                        <Pencil className="h-3.5 w-3.5" />
                        {t('sales.editQuantity', 'Edit quantity')}
                      </SmallAction>
                    ) : null}
                  </span>
                </Step>
              ))}

              {returns.map((row) => {
                const pieces = (row.lines ?? []).reduce((sum, line) => sum + line.quantity, 0)
                return (
                  <Step
                    key={`r-${row.id}`}
                    icon={Undo2}
                    tone="bg-slate-500/12 text-slate-600 app-dark:text-slate-300"
                    title={tp('sales.returnPieceCount', '{count} piece returned|{count} pieces returned', pieces)}
                    meta={new Date(row.created_at).toLocaleString(intlLocale())}
                    amount={formatCents(row.total_cents, currency)}
                  >
                    {row.note ? <span className="block truncate text-[12px] text-ink-muted">{row.note}</span> : null}
                    {canPay ? (
                      <SmallAction className="mt-1.5" disabled={detail.cancelReturn.isPending} onClick={() => detail.setCancelling(row)}>
                        <Undo2 className="h-3.5 w-3.5" />
                        {t('sales.returnCancel', 'Cancel return')}
                      </SmallAction>
                    ) : null}
                  </Step>
                )
              })}

              {document.type === 'albaran' && document.converted_to && !document.can_invoice ? (
                <Step icon={FileOutput} tone="bg-brand-600/12 text-brand-600" title={t('sales.albaranInvoiced', 'Invoiced as')}>
                  <Link to={`/app/invoices/${document.converted_to.id}`} className="font-semibold text-brand-600">
                    {document.converted_to.number}
                  </Link>
                </Step>
              ) : null}

              {voided ? (
                <Step
                  icon={Ban}
                  tone="bg-rose-500/14 text-rose-600 app-dark:text-rose-300"
                  title={t('sales.voided', 'Voided')}
                  meta={document.voided_at ? new Date(document.voided_at).toLocaleString(intlLocale()) : undefined}
                >
                  {document.void_reason ? (
                    <span className="mt-1 block rounded-lg bg-rose-500/8 px-2.5 py-1.5 text-[12px] text-rose-800 app-dark:text-rose-200">
                      <span className="font-semibold">{t('sales.voidReason', 'Reason')}:</span> {document.void_reason}
                    </span>
                  ) : null}
                </Step>
              ) : null}
            </ol>
          </section>

          {canVoid ? (
            <button
              type="button"
              disabled={detail.voiding.isPending}
              onClick={() => detail.setVoidOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 px-4 py-2.5 text-[13px] font-semibold text-rose-600 transition hover:bg-rose-500/10 disabled:opacity-50 app-dark:text-rose-300"
            >
              <Ban className="h-4 w-4" />
              {t('sales.void', 'Void')}
            </button>
          ) : null}
        </aside>
      </div>

      <DocumentDialogs detail={detail} document={document} />
    </div>
  )
}

/** The A4 sheet scaled to fit its column, lying on a gridded desk. It prints full size: the scaling is screen only. */
function Paper({ accent, children }: { accent: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      setScale(Math.min(1, (entry.contentRect.width - 64) / SHEET_WIDTH))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className="desk-desk relative flex justify-center overflow-hidden rounded-[var(--desk-radius)] border border-line/70 px-8 py-8 print:contents">
      <span aria-hidden className="no-print pointer-events-none absolute inset-x-0 top-0 h-1" style={{ background: accent }} />
      <div className="shadow-[0_30px_60px_-30px_rgb(15_23_42/0.45),0_0_0_1px_rgb(15_23_42/0.04)] print:contents print:[zoom:1]!" style={{ zoom: scale }}>
        {children}
      </div>
    </div>
  )
}

function Figure({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className={cn('desk-num', strong ? 'font-bold text-ink' : 'font-semibold text-ink')}>{value}</dd>
    </div>
  )
}

function ActionButton({
  tone = 'ghost',
  icon: Icon,
  busy,
  onClick,
  children,
}: {
  tone?: 'primary' | 'ghost'
  icon: typeof CreditCard
  busy?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button type="button" disabled={busy} onClick={onClick} className={deskButtonClass(tone, cn('w-full', tone === 'primary' ? 'h-11' : 'h-10 text-[12px]'))}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {children}
    </button>
  )
}

function ActionLink({ icon: Icon, to, children }: { icon: typeof Pencil; to: string; children: ReactNode }) {
  return (
    <Link to={to} className={deskButtonClass('ghost', 'h-10 w-full text-[12px]')}>
      <Icon className="h-4 w-4" />
      {children}
    </Link>
  )
}

function ToolButton({ label, hint, busy, disabled, onClick, children }: { label: string; hint?: string; busy?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={hint ? `${label} (${hint})` : label}
      disabled={disabled}
      onClick={onClick}
      className="group inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-card/70 px-3.5 text-[13px] font-semibold text-ink transition hover:border-brand-500/40 hover:bg-card disabled:opacity-50"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
      <span>{label}</span>
      {hint ? <Kbd className="hidden text-ink-muted 2xl:inline-flex">{hint}</Kbd> : null}
    </button>
  )
}

function SmallAction({ disabled, onClick, className, children }: { disabled?: boolean; onClick: () => void; className?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn('inline-flex h-7 items-center gap-1 rounded-lg border border-line bg-card px-2 text-[11px] font-semibold text-ink transition hover:border-brand-500/40 disabled:opacity-50', className)}
    >
      {children}
    </button>
  )
}

function Step({
  icon: Icon,
  tone = 'bg-elevated text-ink-muted',
  title,
  meta,
  amount,
  children,
}: {
  icon: typeof CreditCard
  tone?: string
  title: string
  meta?: string
  amount?: string
  children?: ReactNode
}) {
  return (
    <li className="relative flex gap-3 pl-0">
      <span className={cn('relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-4 ring-[var(--app-card)]', tone)}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1 text-[13px]">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-ink">{title}</p>
          {amount ? <span className="desk-num shrink-0 font-bold text-ink">{amount}</span> : null}
        </div>
        {meta ? <p className="text-[11px] text-ink-muted">{meta}</p> : null}
        {children}
      </div>
    </li>
  )
}

const NOTICE = {
  rose: 'border-rose-500/30 bg-rose-500/8 text-rose-600 app-dark:text-rose-300',
  amber: 'border-amber-500/30 bg-amber-500/10 text-amber-600 app-dark:text-amber-300',
  brand: 'border-line bg-card/70 text-brand-600',
} as const

function Notice({ tone, icon: Icon, title, children }: { tone: keyof typeof NOTICE; icon: typeof CreditCard; title: string; children: ReactNode }) {
  return (
    <section className={cn('rounded-[var(--desk-radius)] border p-4', NOTICE[tone])}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 text-[12px] leading-relaxed text-ink-muted">
          <p className="text-[13px] font-semibold text-ink">{title}</p>
          {children}
        </div>
      </div>
    </section>
  )
}
