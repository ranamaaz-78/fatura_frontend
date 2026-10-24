import { ArrowRight, ChevronLeft, ChevronRight, FileDown, ImageDown, Loader2, Plus, Search, SearchX } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { docPermission, usePermissions } from '../../auth/permissions'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { formatDate } from '../../lib/format'
import { formatCents } from '../../lib/money'
import { rulesFor, typeLabel } from '../../pages/app/documentTypes'
import { listHint, paymentChipLabel, useDocumentList } from '../../pages/app/useDocumentList'
import { isSaleExpired, isSaleVoided, quoteDaysLeft, saleDisplayStatus, type IssuableType, type SaleDisplayStatus, type SaleDocument } from '../../types/sales'
import { initials } from '../shell/IconRail'
import { NEW_DOCUMENTS, newDocumentPath } from '../shell/routes'
import { identityFor } from '../ui/docIdentity'
import { Kbd, Pill, deskButtonClass, type PILL } from '../ui/kit'

function statusTone(status: SaleDisplayStatus): keyof typeof PILL {
  if (status === 'voided') return 'voided'
  if (status === 'returned') return 'neutral'
  if (status === 'partial') return 'partial'
  return status === 'paid' ? 'paid' : 'pending'
}

/**
 * One kind of document (invoices, delivery notes, quotations, proformas) as a workspace: its colour and numbers on top,
 * then a dense grid. The list, filters, search, pages and downloads are the website's own (useDocumentList).
 */
export default function DeskDocumentList({ type }: { type: IssuableType }) {
  const { can } = usePermissions()
  const navigate = useNavigate()
  const list = useDocumentList(type)
  const { currency, rules, payment, setPayment, search, setSearch, debounced, setPage, exporting, exportRow, showsPaymentFilters, query, rows, meta, counts, stats } = list
  const identity = identityFor(type)
  const Icon = identity.icon
  const canCreate = can(docPermission(type, 'create'))
  const shortcut = NEW_DOCUMENTS.find((doc) => doc.type === type)?.key
  const searchRef = useRef<HTMLInputElement>(null)
  const newLabel = t('sales.newOf', 'New :type').replace(':type', typeLabel(type))

  // Ctrl+F jumps to the search box, like any desktop program.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const metrics: { label: string; value: ReactNode; hint: string }[] = [
    { label: t('sales.documentsTitle', 'Documents'), value: counts.all, hint: t('sales.issuedSoFar', 'Issued so far') },
    { label: t('sales.totalValue', 'Total value'), value: formatCents(stats.total_cents, currency), hint: t('sales.allOpenDocs', 'Across every document') },
    ...(rules.settlesPayment
      ? [
          { label: t('sales.paid', 'Paid'), value: stats.paid_count, hint: formatCents(stats.paid_cents, currency) },
          { label: t('sales.pending', 'Pending'), value: formatCents(stats.pending_cents, currency), hint: `${stats.pending_count} ${t('sales.stillOpen', 'still open')}` },
        ]
      : rules.settlesLines
        ? [
            { label: t('sales.settled', 'Settled'), value: formatCents(stats.settled_cents, currency), hint: t('sales.moneyReceived', 'Money recorded on these proformas') },
            { label: t('sales.pending', 'Pending'), value: counts.pending + counts.partial, hint: t('sales.stillOpen', 'still open') },
          ]
        : [
            { label: t('sales.thisMonth', 'This month'), value: stats.month_count, hint: formatCents(stats.month_cents, currency) },
            { label: t('sales.clients', 'Clients'), value: stats.client_count, hint: t('sales.distinctClients', 'Named on these documents') },
          ]),
  ]

  return (
    <div className="space-y-5">
      {/* Who this list is: its colour, its name, and its numbers. */}
      <section className="desk-glass relative overflow-hidden">
        <span className={cn('absolute inset-y-0 left-0 w-1.5', identity.accent)} />
        <span
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full opacity-25 blur-3xl"
          style={{ background: identity.color }}
        />
        <div className="relative flex flex-wrap items-center justify-between gap-5 px-7 pt-6 pb-5">
          <div className="flex items-center gap-4">
            <span className={cn('flex h-14 w-14 items-center justify-center rounded-2xl', identity.chip)}>
              <Icon className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-[26px] leading-tight font-extrabold tracking-[-0.03em] text-ink">{typeLabel(type)}</h1>
              <p className="mt-0.5 max-w-xl text-[13px] text-ink-muted">{listHint(type)}</p>
            </div>
          </div>
          {canCreate ? (
            <Link to={newDocumentPath(type)} className={deskButtonClass('primary', 'h-11 px-5')}>
              <Plus className="h-4 w-4" />
              {newLabel}
              {shortcut ? <Kbd className="ml-1 border-white/40">{shortcut}</Kbd> : null}
            </Link>
          ) : null}
        </div>
        <dl className="relative grid grid-cols-4 border-t border-line/70">
          {metrics.map((metric, index) => (
            <div key={metric.label} className={cn('px-7 py-4', index > 0 && 'border-l border-line/70')}>
              <dt className="text-[11px] font-bold tracking-[0.12em] text-ink-muted uppercase">{metric.label}</dt>
              <dd className="desk-num mt-1.5 truncate text-[22px] leading-none font-extrabold text-ink">{metric.value}</dd>
              <p className="mt-1.5 truncate text-[12px] text-ink-muted">{metric.hint}</p>
            </div>
          ))}
        </dl>
      </section>

      <section className="desk-glass overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-line/70 px-4 py-3">
          <label className="relative w-[360px] max-w-full">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              ref={searchRef}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('sales.searchPlaceholder', 'Search number or client')}
              className="h-10 w-full rounded-xl border border-line bg-card/80 pr-14 pl-10 text-[13px] text-ink outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-600/12"
            />
            <Kbd className="absolute top-1/2 right-3 -translate-y-1/2 text-ink-muted">Ctrl F</Kbd>
          </label>

          {showsPaymentFilters ? (
            <div className="ml-auto flex rounded-xl bg-elevated p-1">
              {list.chips.map((chip) => {
                const on = payment === chip.id
                return (
                  <button
                    key={chip.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setPayment(chip.id)
                      setPage(1)
                    }}
                    className={cn(
                      'inline-flex h-8 items-center gap-2 rounded-lg px-3.5 text-[12px] font-semibold transition',
                      on ? 'bg-card text-ink shadow-sm' : 'text-ink-muted hover:text-ink',
                    )}
                  >
                    {chip.label}
                    <span className={cn('desk-num rounded-md px-1.5 text-[11px]', on ? 'bg-brand-600 text-brand-on' : 'bg-card/70')}>{chip.count}</span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="ml-auto flex items-center gap-2">
              <Pill tone="neutral" dot={false}>
                {type === 'quotation' ? t('sales.notTaxInvoice', 'Not a tax invoice') : t('sales.noTax', 'No tax')}
              </Pill>
              <span className="text-[12px] text-ink-muted">
                {counts.all} {t('sales.documents', 'documents')}
              </span>
            </div>
          )}
        </div>

        {query.isPending && !query.data ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_item, index) => (
              <span key={index} className="block h-14 animate-pulse rounded-xl bg-elevated" />
            ))}
          </div>
        ) : counts.all === 0 && !debounced ? (
          <EmptyBlock
            icon={<Icon className="h-7 w-7" />}
            chip={identity.chip}
            title={t('sales.emptyTitle', 'No documents yet')}
            body={t('sales.emptyOf', 'Issue a :type from New sale.').replace(':type', typeLabel(type))}
            action={
              canCreate ? (
                <Link to={newDocumentPath(type)} className={deskButtonClass('primary')}>
                  <Plus className="h-4 w-4" />
                  {newLabel}
                </Link>
              ) : null
            }
          />
        ) : rows.length === 0 ? (
          <EmptyBlock
            icon={<SearchX className="h-7 w-7" />}
            chip="bg-elevated text-ink-muted"
            title={list.emptyBecauseSearch ? t('sales.searchEmpty', 'No documents match that search') : t('sales.filterEmpty', 'Nothing in this filter')}
            body={
              !list.emptyBecauseSearch && list.emptyBecauseFilter
                ? t('sales.filterEmptyBody', 'Switch back to Any payment to see every document.')
                : t('sales.searchEmptyBody', 'Try a document number or a client name.')
            }
          />
        ) : (
          <>
            <table className="w-full table-fixed border-separate border-spacing-0 text-left">
              <thead>
                <tr className="text-[11px] font-bold tracking-[0.1em] text-ink-muted uppercase">
                  <th className="w-[30%] py-2.5 pl-6 font-bold">{t('sales.document', 'Document')}</th>
                  <th className="w-[22%] py-2.5 font-bold">{t('sales.client', 'Client')}</th>
                  <th className="w-[11%] py-2.5 font-bold">{t('sales.date', 'Date')}</th>
                  <th className="w-[19%] py-2.5 font-bold">{t('sales.status', 'Status')}</th>
                  <th className="w-[10%] py-2.5 pr-4 text-right font-bold">{t('sales.total', 'Total')}</th>
                  <th className="w-[8%] py-2.5 pr-5" aria-label={t('common.actions', 'Actions')} />
                </tr>
              </thead>
              <tbody>
                {rows.map((document) => (
                  <Row
                    key={document.id}
                    document={document}
                    type={type}
                    currency={currency}
                    busy={exporting?.id === document.id ? exporting.format : null}
                    onOpen={() => navigate(`${rules.listPath}/${document.id}`)}
                    onExport={(format) => void exportRow(document, format)}
                  />
                ))}
              </tbody>
            </table>

            {meta && meta.last_page > 1 ? (
              <div className="flex items-center justify-between gap-3 border-t border-line/70 px-6 py-3 text-[12px] text-ink-muted">
                <span>
                  {t('common.showing', 'Showing')}{' '}
                  <span className="desk-num font-semibold text-ink">
                    {list.firstOnPage}-{list.lastOnPage}
                  </span>{' '}
                  {t('common.of', 'of')} <span className="desk-num font-semibold text-ink">{meta.total}</span> {t('sales.documents', 'documents')}
                </span>
                <span className="flex items-center gap-1">
                  <PageButton label={t('common.previous', 'Previous')} disabled={meta.current_page <= 1} onClick={() => setPage(meta.current_page - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </PageButton>
                  {list.pageNumbers.map((number) => (
                    <button
                      key={number}
                      type="button"
                      aria-current={number === meta.current_page ? 'page' : undefined}
                      onClick={() => setPage(number)}
                      className={cn(
                        'desk-num flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-[12px] font-semibold transition',
                        number === meta.current_page ? 'bg-brand-600 text-brand-on' : 'text-ink hover:bg-elevated',
                      )}
                    >
                      {number}
                    </button>
                  ))}
                  <PageButton label={t('common.next', 'Next')} disabled={meta.current_page >= meta.last_page} onClick={() => setPage(meta.current_page + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </PageButton>
                </span>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  )
}

function Row({
  document,
  type,
  currency,
  busy,
  onOpen,
  onExport,
}: {
  document: SaleDocument
  type: IssuableType
  currency: string
  busy: 'png' | 'pdf' | null
  onOpen: () => void
  onExport: (format: 'png' | 'pdf') => void
}) {
  // Older credit notes (abono) can sit in the invoice list; they keep their own colour.
  const identity = identityFor(document.type)
  const credit = document.type === 'abono'

  return (
    <tr onClick={onOpen} className="group cursor-pointer text-[13px] transition-colors hover:bg-elevated/70">
      <td className="relative border-t border-line/60 py-3 pl-6">
        <span className={cn('absolute inset-y-2 left-0 w-1 rounded-r-full opacity-0 transition group-hover:opacity-100', identity.accent)} />
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500/18 to-brand-600/8 text-[12px] font-bold text-brand-600 ring-1 ring-brand-600/15">
            {initials(document.client_name)}
          </span>
          <span className="min-w-0">
            <span className="desk-num block truncate text-[14px] font-bold text-ink">{document.number}</span>
            <span className="block truncate text-[11px] text-ink-muted">{document.client_code ?? typeLabel(document.type)}</span>
          </span>
        </span>
      </td>
      <td className="border-t border-line/60 py-3 pr-3">
        <span className="block truncate font-semibold text-ink">{document.client_name}</span>
        <span className="block truncate text-[11px] text-ink-muted">{document.client_company ?? '—'}</span>
      </td>
      <td className="desk-num border-t border-line/60 py-3 text-[12px] text-ink-muted">{formatDate(document.issued_at)}</td>
      <td className="border-t border-line/60 py-3">
        <span className="flex flex-wrap gap-1.5">
          {credit ? <Pill tone="voided">{typeLabel('abono')}</Pill> : null}
          <DocStatus document={document} type={type} />
        </span>
      </td>
      <td className={cn('desk-num border-t border-line/60 py-3 pr-4 text-right text-[14px] font-extrabold', credit ? 'text-rose-600' : 'text-ink')}>
        {formatCents(document.total_cents, currency)}
      </td>
      <td className="border-t border-line/60 py-3 pr-5">
        <span className="flex items-center justify-end gap-1" onClick={(event) => event.stopPropagation()}>
          <RowAction label={t('sales.downloadPdf', 'Download PDF')} busy={busy === 'pdf'} disabled={busy !== null} onClick={() => onExport('pdf')}>
            <FileDown className="h-4 w-4" />
          </RowAction>
          <RowAction label={t('sales.downloadImage', 'Download as image')} busy={busy === 'png'} disabled={busy !== null} onClick={() => onExport('png')}>
            <ImageDown className="h-4 w-4" />
          </RowAction>
          <ArrowRight className="h-4 w-4 text-ink-muted opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
        </span>
      </td>
    </tr>
  )
}

/** The same status rules as the website's list badges. */
function DocStatus({ document, type }: { document: SaleDocument; type: IssuableType }) {
  const identity = identityFor(type)
  const rules = rulesFor(type)

  if (isSaleVoided(document)) return <Pill tone="voided">{t('sales.voided', 'Voided')}</Pill>
  if (rules.settlesPayment || rules.settlesLines) {
    const status = saleDisplayStatus(document)
    return (
      <>
        <Pill tone={statusTone(status)}>{paymentChipLabel(status)}</Pill>
        {document.payment_status === 'paid' && document.payment_method ? (
          <Pill tone="neutral" dot={false}>
            {document.payment_method.name}
          </Pill>
        ) : null}
      </>
    )
  }
  if (type === 'quotation') {
    if (isSaleExpired(document)) return <Pill tone="voided">{t('sales.expired', 'Expired')}</Pill>
    if (document.expires_at) {
      return (
        <Pill tone={quoteDaysLeft(document.expires_at) <= 2 ? 'pending' : 'violet'}>
          {t('sales.validUntil', 'Valid until')} {formatDate(document.expires_at)}
        </Pill>
      )
    }
    return (
      <span className={cn('inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-semibold', identity.chip)}>
        {t('sales.notTaxInvoice', 'Not a tax invoice')}
      </span>
    )
  }
  return <Pill tone="neutral">{t('sales.noTax', 'No tax')}</Pill>
}

function RowAction({ label, busy, disabled, onClick, children }: { label: string; busy: boolean; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted opacity-60 transition group-hover:opacity-100 hover:bg-brand-600/10 hover:text-brand-600 disabled:opacity-40"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
    </button>
  )
}

function PageButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-ink transition hover:bg-elevated disabled:opacity-35"
    >
      {children}
    </button>
  )
}

function EmptyBlock({ icon, chip, title, body, action }: { icon: ReactNode; chip: string; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-20 text-center">
      <span className={cn('flex h-16 w-16 items-center justify-center rounded-2xl', chip)}>{icon}</span>
      <h3 className="mt-4 text-[15px] font-bold text-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-[13px] text-ink-muted">{body}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}
