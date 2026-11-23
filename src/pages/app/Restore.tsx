import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArchiveRestore, RotateCcw, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { docPermission, usePermissions } from '../../auth/permissions'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageSizeSelect, perPageOf, usePageSize } from '../../components/ui/PageSizeSelect'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { formatDate } from '../../lib/format'
import { formatCents } from '../../lib/money'
import { useAuth } from '../../auth/AuthProvider'
import { getErrorMessage } from '../../services/api'
import { bulkRestoreSales, getTrashCounts, listSales } from '../../services/sales'
import type { IssuableType, SaleDocument } from '../../types/sales'
import { DOCUMENT_TYPES, rulesFor, typeLabel } from './documentTypes'
import { refreshAfterDeleteOrRestore, SelectBox, SelectionBar, useBulkReport } from './documentDeletion'

const TABS: IssuableType[] = DOCUMENT_TYPES

/**
 * The Restore page: every deleted invoice, delivery note, quotation and proforma, one tab each. Pick one or many (or
 * select all) and restore them: the stock goes out again and they come back everywhere. Shared by the website and the app.
 */
export default function Restore() {
  const { can } = usePermissions()
  const { session } = useAuth()
  const { push } = useToast()
  const queryClient = useQueryClient()
  const report = useBulkReport()
  const currency = session?.company?.currency ?? 'EUR'
  const tabs = TABS.filter((type) => can(docPermission(type, 'delete')))
  const [tab, setTab] = useState<IssuableType>(tabs[0] ?? 'factura')
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = usePageSize('restore', 10)
  const [selected, setSelected] = useState<number[]>([])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search), 250)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
    setSelected([])
  }, [tab, debounced, pageSize])

  const counts = useQuery({ queryKey: ['app', 'trash', 'counts'], queryFn: getTrashCounts })

  const list = useQuery({
    queryKey: ['app', 'sales', { trashed: true, type: tab, search: debounced, page, pageSize }],
    queryFn: () => listSales({ type: tab, trashed: true, search: debounced || undefined, page, per_page: perPageOf(pageSize) }),
    placeholderData: keepPreviousData,
    enabled: tabs.includes(tab),
  })

  const rows: SaleDocument[] = list.data?.items ?? []
  const meta = list.data?.meta

  useEffect(() => {
    const here = new Set(rows.map((row) => row.id))
    setSelected((current) => {
      const next = current.filter((id) => here.has(id))
      return next.length === current.length ? current : next
    })
  }, [rows])

  const restoring = useMutation({
    mutationFn: (ids: number[]) => bulkRestoreSales(ids),
    onSuccess: (result) => {
      setSelected((current) => current.filter((id) => !result.done.includes(id)))
      refreshAfterDeleteOrRestore(queryClient)
      report(result, (count) => t('sales.bulkRestored', '{count} restored.', { count }))
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const allSelected = rows.length > 0 && rows.every((row) => selected.includes(row.id))
  const toggle = (id: number) => setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  const first = meta && meta.total > 0 ? (meta.current_page - 1) * meta.per_page + 1 : 0

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-line/80 bg-card p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600/10 text-brand-600">
            <ArchiveRestore className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-[-0.02em] text-ink">{t('restore.title', 'Restore')}</h1>
            <p className="mt-1 max-w-xl text-xs text-ink-muted">
              {t('restore.hint', 'Deleted invoices, delivery notes, quotations and proformas. Restoring brings one back everywhere and takes its stock out again.')}
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line/80 bg-card shadow-xs">
        <div className="flex flex-wrap items-center gap-3 border-b border-line/70 px-4 py-3">
          <div className="flex flex-wrap gap-1.5" role="tablist">
            {tabs.map((type) => {
              const on = tab === type
              return (
                <button
                  key={type}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setTab(type)}
                  className={cn(
                    'inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border px-3.5 text-xs font-semibold transition',
                    on ? 'border-brand-600 bg-brand-600 text-brand-on' : 'border-line bg-card text-ink hover:bg-page',
                  )}
                >
                  {typeLabel(type)}
                  <span className={cn('rounded-full px-1.5 py-0.5 text-[10px]', on ? 'bg-white/20' : 'bg-page text-ink-muted')}>{counts.data?.[type as keyof typeof counts.data] ?? 0}</span>
                </button>
              )
            })}
          </div>
          <label className="relative ml-auto w-64 max-w-full">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('sales.searchPlaceholder', 'Search number or client')}
              className="h-9 w-full rounded-xl border border-line bg-card pr-3 pl-9 text-[13px] outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
            />
          </label>
        </div>

        <SelectionBar
          count={selected.length}
          onAction={() => restoring.mutate(selected)}
          onClear={() => setSelected([])}
          busy={restoring.isPending}
          actionLabel={t('restore.restoreSelected', 'Restore selected')}
          tone="brand"
        />

        {list.isPending && !list.data ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 3 }).map((_item, index) => (
              <span key={index} className="block h-14 animate-pulse rounded-xl bg-page" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ArchiveRestore}
            title={t('restore.empty', 'Nothing deleted here')}
            description={t('restore.emptyBody', 'When you delete one, it waits here until you restore it.')}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left text-[13px]">
                <thead>
                  <tr className="bg-page text-[11px] font-semibold tracking-[0.08em] text-ink-muted uppercase">
                    <th className="w-10 py-2.5 pl-4">
                      <SelectBox
                        checked={allSelected}
                        indeterminate={selected.length > 0 && !allSelected}
                        onChange={() => setSelected(allSelected ? [] : rows.map((row) => row.id))}
                        label={t('sales.selectAll', 'Select all')}
                      />
                    </th>
                    <th className="py-2.5 pl-2">{t('sales.document', 'Document')}</th>
                    <th className="py-2.5">{t('sales.client', 'Client')}</th>
                    <th className="py-2.5">{t('sales.date', 'Date')}</th>
                    <th className="py-2.5">{t('restore.deletedBy', 'Deleted by')}</th>
                    <th className="py-2.5 text-right">{t('sales.total', 'Total')}</th>
                    <th className="w-16 py-2.5 pr-4 text-right">{t('common.actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((document) => (
                    <tr key={document.id} className="hover:bg-page">
                      <td className="border-t border-line/60 py-3 pl-4">
                        <SelectBox checked={selected.includes(document.id)} onChange={() => toggle(document.id)} label={`${t('sales.select', 'Select')} ${document.number}`} />
                      </td>
                      <td className="border-t border-line/60 py-3 pl-2">
                        <Link to={`${rulesFor(document.type).listPath}/${document.id}`} className="font-bold text-ink hover:text-brand-600">
                          {document.number}
                        </Link>
                      </td>
                      <td className="border-t border-line/60 py-3 pr-3">
                        <span className="block truncate font-semibold text-ink">{document.client_name}</span>
                      </td>
                      <td className="border-t border-line/60 py-3 text-xs text-ink-muted">{formatDate(document.issued_at)}</td>
                      <td className="border-t border-line/60 py-3 text-xs text-ink-muted">
                        {document.deleted_by_name ?? '—'}
                        {document.deleted_at ? <span className="block">{formatDate(document.deleted_at)}</span> : null}
                      </td>
                      <td className="border-t border-line/60 py-3 text-right font-bold text-ink">{formatCents(document.total_cents, currency)}</td>
                      <td className="border-t border-line/60 py-3 pr-4 text-right">
                        <button
                          type="button"
                          title={t('sales.restore', 'Restore')}
                          aria-label={`${t('sales.restore', 'Restore')} ${document.number}`}
                          disabled={restoring.isPending}
                          onClick={() => restoring.mutate([document.id])}
                          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-ink-muted transition hover:bg-brand-600/10 hover:text-brand-600 disabled:opacity-40"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {meta && meta.total > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs text-ink-muted">
                <span>
                  {t('common.showing', 'Showing')} <span className="text-ink">{first}-{first + rows.length - 1}</span> {t('common.of', 'of')}{' '}
                  <span className="text-ink">{meta.total}</span>
                </span>
                <PageSizeSelect value={pageSize} onChange={setPageSize} />
                <span className={cn('flex items-center gap-1.5', meta.last_page <= 1 && 'hidden')}>
                  <button
                    type="button"
                    disabled={meta.current_page <= 1}
                    onClick={() => setPage(meta.current_page - 1)}
                    className="flex h-8 items-center rounded-[10px] border border-line px-3 text-ink disabled:text-ink-muted/50 enabled:cursor-pointer enabled:hover:bg-page"
                  >
                    {t('common.previous', 'Previous')}
                  </button>
                  <button
                    type="button"
                    disabled={meta.current_page >= meta.last_page}
                    onClick={() => setPage(meta.current_page + 1)}
                    className="flex h-8 items-center rounded-[10px] border border-line px-3 text-ink disabled:text-ink-muted/50 enabled:cursor-pointer enabled:hover:bg-page"
                  >
                    {t('common.next', 'Next')}
                  </button>
                </span>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
