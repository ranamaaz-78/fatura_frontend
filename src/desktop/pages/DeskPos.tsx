import { Camera, Check, Minus, PackageSearch, Plus, ScanLine, Search, ShieldCheck, ShoppingBasket, Trash2, UserRound, X } from 'lucide-react'
import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { Link } from 'react-router-dom'
import { docPermission } from '../../auth/permissions'
import { intlLocale, t } from '../../i18n'
import { cn } from '../../lib/cn'
import { isPastMonth, nowLocal, shortDate, snapIssueDate } from '../../lib/issueDate'
import { formatCents } from '../../lib/money'
import { onlyDecimal } from '../../lib/numberInput'
import { DiscountEditor } from '../../pages/app/DiscountEditor'
import { ISSUABLE_TYPES, typeLabel } from '../../pages/app/documentTypes'
import { RecargoPicker } from '../../pages/app/RecargoPicker'
import { RecordPaymentModal } from '../../pages/app/RecordPaymentModal'
import { QUOTE_VALID_DAYS, initials, ivaOptions, useSaleComposer, type DraftLine, type SaleComposer } from '../../pages/app/useSaleComposer'
import { getErrorMessage } from '../../services/api'
import { identityFor } from '../ui/docIdentity'
import { Kbd, Shimmer, deskButtonClass } from '../ui/kit'

const fieldLabel = 'mb-1.5 block text-[11px] font-bold tracking-[0.08em] text-ink-muted uppercase'
const field =
  'h-10 w-full rounded-xl border border-line bg-card/80 px-3 text-[13px] text-ink outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-600/12'
// The client card is a little tighter, so the bill and the Issue button stay in view on a 1080p screen.
const clientField =
  'h-9 w-full rounded-xl border border-line bg-card/80 px-3 text-[13px] text-ink outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-600/12'

/**
 * The POS as a counter: a scanner bar and the receipt on the left, the client and the bill on the right. The sale
 * itself (lines, stock checks, totals, issuing) is the website's own (useSaleComposer).
 */
export default function DeskPos() {
  const sale = useSaleComposer()
  const { editing, existing, hydrated, type, rules, save, submit } = sale
  const scanRef = useRef<HTMLInputElement>(null)
  const submitRef = useRef(submit)
  submitRef.current = submit

  // The scanner bar is ready as soon as the screen opens; Ctrl+Enter issues, like pressing the big button.
  useEffect(() => {
    if (!editing || hydrated) scanRef.current?.focus()
  }, [editing, hydrated])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault()
        submitRef.current()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  if (editing && existing.isError) {
    return <div className="rounded-[var(--desk-radius)] border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-700">{getErrorMessage(existing.error)}</div>
  }

  if (editing && !hydrated) {
    return (
      <div className="grid grid-cols-[minmax(0,1fr)_400px] gap-5">
        <Shimmer className="h-[640px]" />
        <Shimmer className="h-[640px]" />
      </div>
    )
  }

  const identity = identityFor(type)
  const busyLabel = editing ? t('common.saving', 'Saving') : t('sales.issuing', 'Issuing...')

  return (
    <div>
      {/* Two columns from the top: the sale on the left, the client and the bill on the right (always in view). */}
      <div className="grid grid-cols-[minmax(0,1fr)_400px] items-start gap-5">
        <div className="min-w-0 space-y-5">
          <Header sale={sale} />
          <Scanner sale={sale} inputRef={scanRef} />
          <Receipt sale={sale} />
          <Notes sale={sale} />
        </div>

        <aside className="sticky top-0 space-y-4">
          <ClientCard sale={sale} />

          <section className="desk-glass-strong overflow-hidden">
            <span className={cn('block h-1', identity.accent)} />
            <div className="p-5">
              <p className="text-[11px] font-bold tracking-[0.12em] text-ink-muted uppercase">{t('sales.settlement', 'Settlement')}</p>
              <Bill sale={sale} />

              {!editing && rules.settlesPayment ? (
                <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-elevated p-1">
                  {(['pending', 'paid'] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => sale.setPayment(status)}
                      className={cn(
                        'h-9 rounded-lg text-[12px] font-bold transition',
                        sale.payment === status
                          ? status === 'paid'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-amber-500 text-white shadow-sm'
                          : 'text-ink-muted hover:text-ink',
                      )}
                    >
                      {status === 'paid' ? t('sales.paid', 'Paid') : t('sales.pending', 'Pending')}
                    </button>
                  ))}
                </div>
              ) : null}

              <button type="button" disabled={save.isPending} onClick={submit} className={deskButtonClass('primary', 'mt-4 h-13 w-full text-[14px]')}>
                {save.isPending ? busyLabel : sale.issueLabel}
                {save.isPending ? null : <Kbd className="ml-1 border-white/40">Ctrl ↵</Kbd>}
              </button>
            </div>
          </section>
        </aside>
      </div>

      {sale.camera ? <CameraDialog sale={sale} /> : null}

      <RecordPaymentModal
        open={sale.methodOpen}
        loading={save.isPending}
        title={t('payments.issuePaidTitle', 'How was this paid?')}
        subtitle={t('payments.issuePaidSubtitle', 'The document will be issued as paid with this method.')}
        confirmLabel={sale.issueLabel}
        onClose={() => sale.setMethodOpen(false)}
        onConfirm={sale.confirmMethod}
      />
    </div>
  )
}

/** What is being made: the kind of document (one colour each), its number and date, and whether stock moves. */
function Header({ sale }: { sale: SaleComposer }) {
  const { editing, type, setType, can, rules, existing, preview, issuedAt, setIssuedAt, datedByMonth, quoteEnd } = sale
  const options = ISSUABLE_TYPES.filter((option) => can(docPermission(option, 'create')))
  const title = editing
    ? type === 'albaran'
      ? t('sales.editDeliveryNote', 'Edit delivery note')
      : t('sales.editQuote', 'Edit quotation')
    : t('sales.newTitle', 'New sale')

  return (
    <section className="desk-glass relative overflow-hidden px-6 py-5">
      <span aria-hidden className="pointer-events-none absolute -top-24 left-1/3 h-56 w-[50%] rounded-full opacity-20 blur-3xl transition-colors" style={{ background: identityFor(type).color }} />

      {/* First line: what this screen is, and whether stock moves. */}
      <div className="relative flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <h1 className="text-[24px] leading-tight font-extrabold tracking-[-0.03em] text-ink">{title}</h1>
          <p className="mt-0.5 max-w-xl text-[12px] text-ink-muted">
            {editing
              ? type === 'albaran'
                ? t('sales.editDeliveryNoteHint', 'Change the client or the lines while it is unpaid. The number and date stay, and the stock is adjusted by the difference.')
                : t('sales.editQuoteHint', 'Change the client or the lines. The quotation number stays.')
              : t('sales.newSubtitle', 'Invoice, delivery note, quotation or proforma, with the client and the lines on one screen.')}
          </p>
        </div>
        <span
          className={cn(
            'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold ring-1 ring-inset',
            rules.movesStock ? 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 app-dark:text-emerald-300' : 'bg-elevated text-ink-muted ring-line',
          )}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          {rules.movesStock ? t('sales.stockProtected', 'Stock protected, no negatives') : t('sales.stockUntouched', 'Stock is not touched')}
        </span>
      </div>

      {/* Second line: the kind of document, then its number and date. */}
      <div className="relative mt-4 flex flex-wrap items-start gap-x-6 gap-y-4">
        {/* One button per kind of document, each in its own colour. Lined up with the fields beside it, under their labels. */}
        <div className="mt-4 flex flex-wrap gap-1.5 rounded-2xl bg-elevated/80 p-1.5">
          {(editing ? [type] : options).map((option) => {
            const optionIdentity = identityFor(option)
            const OptionIcon = optionIdentity.icon
            const on = type === option
            return (
              <button
                key={option}
                type="button"
                disabled={editing}
                onClick={() => setType(option)}
                className={cn(
                  'inline-flex h-10 items-center gap-2 rounded-xl px-3.5 text-[13px] font-bold transition',
                  on ? 'bg-card text-ink shadow-[0_6px_20px_-10px_rgb(15_23_42/0.4)]' : 'text-ink-muted hover:bg-card/60 hover:text-ink',
                )}
              >
                <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg', on ? optionIdentity.chip : 'bg-transparent')}>
                  <OptionIcon className="h-4 w-4" />
                </span>
                {typeLabel(option)}
              </button>
            )
          })}
        </div>

        <div className="ml-auto flex flex-wrap items-start gap-4">
          <div>
            <span className={fieldLabel}>{t('sales.number', 'Number')}</span>
            <span className="desk-num flex h-10 items-center rounded-xl border border-line bg-card/80 px-3 text-[14px] font-extrabold text-ink">
              {editing ? (existing.data?.number ?? '—') : (preview.data?.number ?? '—')}
            </span>
          </div>
          <div className="w-[220px]">
            <span className={fieldLabel}>{t('sales.issuedAt', 'Date and time')}</span>
            <input
              type="datetime-local"
              value={issuedAt}
              max={datedByMonth ? nowLocal() : undefined}
              disabled={editing && type === 'albaran'}
              onChange={(event) => setIssuedAt(datedByMonth ? snapIssueDate(event.target.value) : event.target.value)}
              className={cn(field, 'desk-num disabled:opacity-60')}
            />
            {editing && type === 'albaran' ? (
              <span className="mt-1 block text-[11px] leading-snug text-ink-muted">{t('sales.deliveryDateFixed', 'The date and number of a delivery note stay as they were issued.')}</span>
            ) : null}
            {!(editing && type === 'albaran') && datedByMonth && isPastMonth(issuedAt) ? (
              <span className="mt-1 block text-[11px] leading-snug text-ink-muted">
                {t('sales.pastMonthHint', 'Past month: the date can only be its last day (:date).').replace(':date', shortDate(issuedAt))}
              </span>
            ) : null}
            {type === 'quotation' && quoteEnd ? (
              <span className={cn('mt-1 block text-[11px] leading-snug', quoteEnd.getTime() < Date.now() ? 'font-semibold text-rose-600' : 'text-ink-muted')}>
                {quoteEnd.getTime() < Date.now()
                  ? t('sales.quoteWouldExpire', 'This date is more than a week ago, so the quotation would be expired straight away.')
                  : `${t('sales.validUntil', 'Valid until')} ${quoteEnd.toLocaleDateString(intlLocale())} (${QUOTE_VALID_DAYS} ${t('sales.daysFromDate', 'days from this date')})`}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}

/** The scanner bar: type or scan, Enter adds the first match. */
function Scanner({ sale, inputRef }: { sale: SaleComposer; inputRef: RefObject<HTMLInputElement | null> }) {
  const { productQuery, setProductQuery, dropdown, setDropdown, camera, setCamera, catalog, productMatches, addProduct, piecesLeft, onProductKeyDown, currency } = sale
  const open = dropdown && !camera && productQuery.trim() !== ''

  return (
    <section className="relative z-20">
      <div className="desk-glass-strong flex items-center gap-3 p-2.5">
        <span className="relative min-w-0 flex-1">
          <ScanLine className="pointer-events-none absolute top-1/2 left-4 h-6 w-6 -translate-y-1/2 text-brand-600" />
          <input
            ref={inputRef}
            value={productQuery}
            onChange={(event) => {
              setProductQuery(event.target.value)
              setDropdown(true)
            }}
            onKeyDown={onProductKeyDown}
            onFocus={() => setDropdown(true)}
            placeholder={t('sales.findProduct', 'Scan a barcode or search a product')}
            className="h-14 w-full rounded-xl bg-transparent pr-24 pl-14 text-[16px] font-semibold text-ink outline-none placeholder:font-medium placeholder:text-ink-muted"
          />
          <Kbd className="absolute top-1/2 right-4 -translate-y-1/2 text-ink-muted">Enter ↵</Kbd>
        </span>
        <button
          type="button"
          onClick={() => {
            setDropdown(true)
            setCamera(true)
          }}
          className={deskButtonClass('ghost', 'h-12 px-4')}
        >
          <Camera className="h-4 w-4" />
          {t('sales.camera', 'Scan code')}
        </button>
      </div>

      {open ? (
        <div className="desk-glass-strong desk-pop absolute top-full right-0 left-0 mt-2 overflow-hidden p-2">
          {catalog.isPending ? (
            <p className="px-4 py-4 text-[13px] text-ink-muted">{t('sales.phoneSearching', 'Searching…')}</p>
          ) : productMatches.length === 0 ? (
            <p className="flex items-center gap-2 px-4 py-4 text-[13px] text-ink-muted">
              <PackageSearch className="h-4 w-4" />
              {t('sales.noProduct', 'No product matches that.')}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {productMatches.map((product, index) => {
                const left = piecesLeft(product.id, product.quantity)
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addProduct(product)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition',
                      index === 0 ? 'bg-brand-600/10 ring-1 ring-brand-600/30' : 'hover:bg-elevated',
                    )}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-elevated text-[11px] font-bold text-ink-muted">
                      {initials(product.article)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold text-ink">{product.article}</span>
                      <span className="desk-num block truncate text-[11px] text-ink-muted">
                        {product.barcode} · IVA {product.iva_percent}%
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="desk-num block text-[14px] font-extrabold text-ink">{formatCents(product.selling_price, currency)}</span>
                      <span className={cn('desk-num text-[11px] font-semibold', left <= 0 ? 'text-rose-600' : 'text-ink-muted')}>
                        {left} {t('sales.left', 'left')}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ) : null}
    </section>
  )
}

/** The lines, like a receipt being written. Columns follow the document's rules (tax, discount, stock). */
function Receipt({ sale }: { sale: SaleComposer }) {
  const { lines, setLines, rules } = sale
  const columns = [
    '32px',
    'minmax(0,1fr)',
    rules.showsAvailable ? '120px' : null,
    '116px',
    '104px',
    rules.carriesDiscount ? '72px' : null,
    rules.carriesTax ? '92px' : null,
    rules.showsPriceWithTax ? '100px' : null,
    '110px',
    '36px',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section className="desk-glass overflow-hidden">
      <header className="flex items-center justify-between px-5 pt-4 pb-3">
        <h2 className="flex items-center gap-2 text-[11px] font-bold tracking-[0.12em] text-ink-muted uppercase">
          <ShoppingBasket className="h-4 w-4" />
          {t('sales.lines', 'Lines')}
          <span className="desk-num rounded-md bg-brand-600 px-1.5 py-px text-[11px] text-brand-on">{lines.length}</span>
        </h2>
        {lines.length > 0 ? (
          <button type="button" onClick={() => setLines([])} className="rounded-lg px-2 py-1 text-[12px] font-semibold text-rose-600 transition hover:bg-rose-500/10">
            {t('sales.clearLines', 'Clear lines')}
          </button>
        ) : null}
      </header>

      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="grid items-center gap-2 border-y border-line/70 bg-elevated/50 px-5 py-2 text-[11px] font-bold tracking-[0.06em] text-ink-muted uppercase" style={{ gridTemplateColumns: columns }}>
            <span className="text-center">#</span>
            <span>{t('sales.article', 'Article')}</span>
            {rules.showsAvailable ? <span>{t('sales.available', 'Available')}</span> : null}
            <span className="text-center">{t('sales.qty', 'Quantity')}</span>
            <span className="text-right">{t('sales.price', 'Price')}</span>
            {rules.carriesDiscount ? <span className="text-right">{t('sales.dto', 'Dto %')}</span> : null}
            {rules.carriesTax ? <span>{t('sales.iva', '% IVA')}</span> : null}
            {rules.showsPriceWithTax ? (
              <>
                <span className="text-right">{t('sales.priceNet', 'Without tax')}</span>
                <span className="text-right">{t('sales.priceGross', 'With tax')}</span>
              </>
            ) : (
              <span className="text-right">{t('sales.total', 'Total')}</span>
            )}
            <span />
          </div>

          {lines.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600/10 text-brand-600">
                <ScanLine className="h-7 w-7" />
              </span>
              <p className="mt-4 text-[13px] text-ink-muted">{t('sales.emptyLines', 'Search a product above to add the first line.')}</p>
            </div>
          ) : (
            lines.map((line, index) => <LineRow key={line.key} sale={sale} line={line} index={index} columns={columns} />)
          )}
        </div>
      </div>
    </section>
  )
}

function LineRow({ sale, line, index, columns }: { sale: SaleComposer; line: DraftLine; index: number; columns: string }) {
  const { rules, lineMath, changeLine, changeQuantity, setLines, taxRates, currency } = sale
  const math = lineMath.get(line.key) ?? { base: 0, tax: 0, total: 0, iva: 0 }
  const atStock = line.stock !== null && rules.movesStock && line.quantity >= line.stock
  // A quotation reserves nothing, so its count stays at the shelf.
  const remaining = line.stock === null ? null : rules.movesStock ? line.stock - line.quantity : line.stock
  const ratio = line.stock && remaining !== null ? Math.max(0, Math.min(1, remaining / line.stock)) : 0
  const tone =
    remaining === null
      ? 'bg-slate-400'
      : remaining <= 0
        ? 'bg-rose-500'
        : line.stock !== null && remaining <= Math.max(1, Math.floor(line.stock * 0.1))
          ? 'bg-amber-500'
          : 'bg-emerald-500'

  return (
    <div className="desk-rise group grid items-center gap-2 border-b border-dashed border-line/80 px-5 py-3 last:border-b-0 hover:bg-elevated/40" style={{ gridTemplateColumns: columns }}>
      <span className="desk-num text-center text-[12px] font-semibold text-ink-muted">{index + 1}</span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-bold text-ink">{line.article}</span>
        {line.description ? <span className="block truncate text-[11px] text-ink-muted">{line.description}</span> : null}
      </span>
      {rules.showsAvailable ? (
        <span className="min-w-0">
          {remaining === null || line.stock === null ? (
            <span className="text-[12px] text-ink-muted">—</span>
          ) : (
            <>
              <span className="desk-num block text-[12px] font-semibold text-ink">
                {remaining} <span className="font-normal text-ink-muted">/ {line.stock}</span>
              </span>
              <span className="mt-1 block h-1 overflow-hidden rounded-full bg-elevated" title={t('sales.ofAvailable', ':left of :stock available').replace(':left', String(remaining)).replace(':stock', String(line.stock))}>
                <span className={cn('block h-full rounded-full', tone)} style={{ width: `${Math.max(ratio * 100, 3)}%` }} />
              </span>
            </>
          )}
        </span>
      ) : null}
      <span className="flex justify-center">
        <span className="inline-flex items-center rounded-xl bg-elevated p-0.5">
          <button type="button" aria-label="−" onClick={() => changeQuantity(line, line.quantity - 1)} className="flex h-8 w-8 items-center justify-center rounded-lg text-ink transition hover:bg-card">
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="desk-num w-9 text-center text-[14px] font-extrabold text-ink">{line.quantity}</span>
          <button
            type="button"
            aria-label="+"
            disabled={atStock}
            onClick={() => changeQuantity(line, line.quantity + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink transition hover:bg-card disabled:opacity-30"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </span>
      </span>
      <input
        aria-label={`${t('sales.price', 'Price')} ${line.article}`}
        value={line.unitPrice}
        inputMode="decimal"
        onChange={(event) => changeLine(line.key, { unitPrice: onlyDecimal(event.target.value) })}
        placeholder={rules.manualPrice ? t('sales.typePrice', 'Price') : undefined}
        className={cn(
          'desk-num h-9 w-full rounded-lg border px-2 text-right text-[13px] font-bold text-ink outline-none transition focus:border-brand-600',
          rules.manualPrice && line.unitPrice.trim() === '' ? 'border-amber-400 bg-amber-500/10' : 'border-line bg-card/80',
        )}
      />
      {rules.carriesDiscount ? (
        <input
          aria-label={`${t('sales.dto', 'Dto %')} ${line.article}`}
          value={line.discount}
          inputMode="decimal"
          onChange={(event) => changeLine(line.key, { discount: onlyDecimal(event.target.value) })}
          className="desk-num h-9 w-full rounded-lg border border-line bg-card/80 px-2 text-right text-[13px] text-ink outline-none focus:border-brand-600"
        />
      ) : null}
      {rules.carriesTax ? (
        <select
          aria-label={t('sales.iva', '% IVA')}
          value={line.iva}
          onChange={(event) => changeLine(line.key, { iva: event.target.value })}
          className="desk-num h-9 w-full rounded-lg border border-line bg-card/80 px-2 text-[13px] text-ink outline-none focus:border-brand-600"
        >
          {ivaOptions(taxRates.data ?? [], line.iva).map((option) => (
            <option key={option} value={option}>
              {option}%
            </option>
          ))}
        </select>
      ) : null}
      {rules.showsPriceWithTax ? (
        <>
          <span className="desk-num text-right text-[13px] font-bold text-ink">{formatCents(math.base, currency)}</span>
          <span className="desk-num text-right text-[14px] font-extrabold text-brand-600">{formatCents(math.total, currency)}</span>
        </>
      ) : (
        <span className="desk-num text-right text-[14px] font-extrabold text-ink">{formatCents(math.total, currency)}</span>
      )}
      <button
        type="button"
        title={t('common.delete', 'Delete')}
        aria-label={`${t('common.delete', 'Delete')} ${line.article}`}
        onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted opacity-50 transition group-hover:opacity-100 hover:bg-rose-500/10 hover:text-rose-600"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

/** The note printed on the document, from Printables. */
function Notes({ sale }: { sale: SaleComposer }) {
  const { noteText, printTemplates } = sale
  return (
    <section className="desk-glass px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-bold tracking-[0.12em] text-ink-muted uppercase">{t('sales.notes', 'Notes')}</h2>
        <Link to="/app/printables" className="rounded-lg px-2 py-1 text-[11px] font-semibold text-brand-600 transition hover:bg-brand-50">
          {t('sales.notesEdit', 'Edit in Printables')}
        </Link>
      </div>
      {noteText ? (
        <p className="mt-2 text-[12px] leading-relaxed whitespace-pre-wrap text-ink">{noteText}</p>
      ) : (
        <p className="mt-2 text-[12px] leading-relaxed text-ink-muted">
          {printTemplates.isPending ? t('common.loading', 'Loading') : t('sales.notesNone', 'No note set for this document type. Add one in Printables.')}
        </p>
      )}
    </section>
  )
}

/** Who it is for: search by phone, or type a new client (saved with the document). */
function ClientCard({ sale }: { sale: SaleComposer }) {
  const {
    customerId,
    selectedCustomer,
    hasClientData,
    clearCustomer,
    clientPhone,
    onPhoneChange,
    onPhoneKeyDown,
    phoneMatches,
    pickCustomer,
    clientName,
    setClientName,
    clientCompany,
    setClientCompany,
    clientNif,
    setClientNif,
    clientAddress,
    setClientAddress,
    phoneNeedle,
    customers,
  } = sale

  return (
    <section className="desk-glass relative z-10 px-5 py-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[11px] font-bold tracking-[0.12em] text-ink-muted uppercase">
          <UserRound className="h-4 w-4" />
          {t('sales.clientHeading', 'Client')}
        </h2>
        <div className="flex items-center gap-1.5 text-[11px]">
          {customerId !== null ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5 font-semibold text-emerald-700 app-dark:text-emerald-300">
              <Check className="h-3 w-3" strokeWidth={3} />
              {t('sales.savedClient', 'Saved client')}
              {selectedCustomer ? <span>· {selectedCustomer.code}</span> : null}
            </span>
          ) : hasClientData ? (
            <span className="rounded-full bg-brand-600/12 px-2 py-0.5 font-semibold text-brand-600">{t('sales.newClient', 'New client')}</span>
          ) : null}
          {hasClientData ? (
            <button type="button" onClick={clearCustomer} className="inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 font-semibold text-ink-muted transition hover:bg-rose-500/10 hover:text-rose-600">
              <X className="h-3.5 w-3.5" />
              {t('sales.clearClient', 'Clear')}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-3 space-y-2.5">
        <div className="relative">
          <span className={fieldLabel}>{t('sales.phone', 'Telephone')}</span>
          <span className="relative block">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              value={clientPhone}
              onChange={(event) => onPhoneChange(event.target.value)}
              onKeyDown={onPhoneKeyDown}
              inputMode="tel"
              autoComplete="off"
              placeholder={t('sales.phoneSearch', 'Search by phone number')}
              className={cn(clientField, 'desk-num pl-9')}
            />
          </span>
          {customerId === null && phoneMatches.length > 0 ? (
            <div className="desk-glass-strong desk-pop absolute top-full right-0 left-0 z-30 mt-1.5 overflow-hidden p-1.5">
              {phoneMatches.map((customer, position) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => pickCustomer(customer)}
                  className={cn('flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition', position === 0 ? 'bg-brand-600/10' : 'hover:bg-elevated')}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600/12 text-[11px] font-bold text-brand-600">{customer.name.slice(0, 2).toUpperCase()}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-bold text-ink">{customer.name}</span>
                    <span className="block truncate text-[11px] text-ink-muted">{[customer.company_name, customer.phone, customer.nif || customer.nie].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span className="shrink-0 text-[10px] font-semibold text-ink-muted">{customer.code}</span>
                </button>
              ))}
            </div>
          ) : null}
          {customerId === null && phoneNeedle.length >= 3 ? (
            <p className={cn('mt-1.5 text-[11px] font-medium', !customers.isPending && phoneMatches.length === 0 ? 'text-brand-600' : 'text-ink-muted')}>
              {customers.isPending
                ? t('sales.phoneSearching', 'Searching…')
                : phoneMatches.length === 0
                  ? t('sales.phoneNew', 'No client on this number. Fill in the details — they will be saved as a new client.')
                  : t('sales.phoneEnter', 'Press Enter to use the highlighted client.')}
            </p>
          ) : null}
        </div>

        <Field label={t('sales.clientName', 'Name')} required>
          <input value={clientName} onChange={(event) => setClientName(event.target.value)} autoComplete="off" className={cn(clientField, 'font-semibold')} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('sales.clientCompany', 'Company name')}>
            <input value={clientCompany} onChange={(event) => setClientCompany(event.target.value)} autoComplete="off" className={clientField} />
          </Field>
          <Field label={t('sales.taxId', 'N.I.F/N.I.E')}>
            <input value={clientNif} onChange={(event) => setClientNif(event.target.value.toUpperCase())} autoComplete="off" className={cn(clientField, 'uppercase')} />
          </Field>
        </div>
        <Field label={t('sales.clientAddress', 'Address')}>
          <input
            value={clientAddress}
            onChange={(event) => setClientAddress(event.target.value)}
            maxLength={255}
            autoComplete="off"
            placeholder={t('sales.clientAddressPlaceholder', 'Street, number, city')}
            className={clientField}
          />
        </Field>
      </div>
    </section>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className={fieldLabel}>
        {label}
        {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
      </span>
      {children}
    </label>
  )
}

/** The bill: subtotal, discount, tax by rate, recargo, and the total, big. */
function Bill({ sale }: { sale: SaleComposer }) {
  const {
    rules,
    currency,
    totals,
    discountOpen,
    setDiscountOpen,
    discountKind,
    setDiscountKind,
    discountInput,
    setDiscountInput,
    discountError,
    recargoRates,
    recargo,
    setRecargoId,
    recargoCents,
    grandTotal,
  } = sale

  return (
    <div className="mt-3 space-y-2 text-[13px]">
      <Line label={t('sales.subtotal', 'Subtotal')} value={formatCents(discountOpen ? totals.gross : totals.base, currency)} />
      {rules.carriesDiscount ? (
        <DiscountEditor
          open={discountOpen}
          kind={discountKind}
          value={discountInput}
          appliedCents={discountError ? 0 : totals.discount}
          currency={currency}
          error={discountError}
          onOpen={() => setDiscountOpen(true)}
          onClear={() => {
            setDiscountOpen(false)
            setDiscountInput('')
          }}
          onKind={setDiscountKind}
          onValue={setDiscountInput}
        />
      ) : null}
      {discountOpen && rules.carriesTax ? <Line label={t('sales.subtotalAfterDiscount', 'Subtotal after discount')} value={formatCents(totals.base, currency)} /> : null}
      {rules.carriesTax ? (
        <>
          {totals.groups.map(([rate, group]) => (
            <span key={rate} className="flex justify-between border-l-2 border-brand-500 pl-2 text-[12px] text-ink-muted">
              <span>
                IVA {rate}% ({formatCents(group.base, currency)})
              </span>
              <span className="desk-num">{formatCents(group.tax, currency)}</span>
            </span>
          ))}
          <Line label={t('sales.taxTotal', 'Tax')} value={formatCents(totals.tax, currency)} />
          {rules.showsPriceWithTax ? <Line label={t('sales.priceNet', 'Without tax')} value={formatCents(totals.base, currency)} /> : null}
        </>
      ) : null}
      {rules.allowsRecargo ? (
        <RecargoPicker
          rates={recargoRates.data ?? []}
          loading={recargoRates.isPending}
          selectedId={recargo?.id ?? null}
          onSelect={setRecargoId}
          amountCents={recargoCents}
          currency={currency}
        />
      ) : null}
      <div className="mt-3 flex items-end justify-between border-t border-dashed border-line pt-4">
        <span className="text-[12px] font-bold tracking-[0.1em] text-ink-muted uppercase">{t('sales.grandTotal', 'Total')}</span>
        <span className="desk-num text-[34px] leading-none font-extrabold text-ink">{formatCents(grandTotal, currency)}</span>
      </div>
    </div>
  )
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex justify-between text-ink-muted">
      <span>{label}</span>
      <span className="desk-num font-bold text-ink">{value}</span>
    </span>
  )
}

/** Typing or scanning a barcode by hand, the same as the website's camera box. */
function CameraDialog({ sale }: { sale: SaleComposer }) {
  const { setCamera, productMatches, productQuery, setProductQuery, setDropdown, addProduct, push } = sale
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4 backdrop-blur-sm">
      <div role="dialog" aria-label={t('sales.camera', 'Scan code')} className="desk-glass-strong desk-pop w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="flex items-center gap-2 text-[15px] font-bold text-ink">
            <ScanLine className="h-5 w-5 text-brand-600" />
            {t('sales.cameraTitle', 'Find by barcode')}
          </h3>
          <button type="button" aria-label={t('common.close', 'Close')} onClick={() => setCamera(false)} className="rounded-lg p-1.5 text-ink-muted transition hover:bg-elevated hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form
          className="flex gap-2 p-5"
          onSubmit={(event) => {
            event.preventDefault()
            const match = productMatches.find((product) => product.barcode === productQuery.trim()) ?? productMatches[0]
            if (match) addProduct(match)
            else push({ tone: 'danger', title: t('sales.noProduct', 'No product matches that.') })
          }}
        >
          <input
            autoFocus
            value={productQuery}
            onChange={(event) => {
              setProductQuery(event.target.value)
              setDropdown(true)
            }}
            placeholder={t('sales.barcodePlaceholder', 'Type or scan the barcode')}
            className={cn(field, 'desk-num h-11')}
          />
          <button type="submit" className={deskButtonClass('primary', 'h-11')}>
            {t('sales.add', 'Add')}
          </button>
        </form>
      </div>
    </div>
  )
}
