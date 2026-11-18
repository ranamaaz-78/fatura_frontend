import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { docPermission, usePermissions } from '../../auth/permissions'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { getErrorMessage } from '../../services/api'
import { bulkDeleteSales, type BulkResult } from '../../services/sales'
import type { IssuableType, SaleDocument } from '../../types/sales'

/** What every screen does after deleting or restoring: the lists, the counts, the stock and the money all change. */
export function refreshAfterDeleteOrRestore(queryClient: ReturnType<typeof useQueryClient>) {
  for (const key of ['sales', 'sale', 'products', 'dashboard', 'payments', 'trash']) {
    void queryClient.invalidateQueries({ queryKey: ['app', key] })
  }
}

/** Says what a bulk action did: how many went through, and which one was refused and why. */
export function useBulkReport() {
  const { push } = useToast()
  return useCallback(
    (result: BulkResult, doneMessage: (count: number) => string) => {
      if (result.done.length > 0) push({ tone: 'success', title: doneMessage(result.done.length) })
      const first = result.failed[0]
      if (first) {
        const head = result.failed.length === 1 ? '' : t('sales.bulkSomeFailed', '{count} could not be done. ', { count: result.failed.length })
        push({ tone: 'danger', title: `${head}${first.number ? `${first.number}: ` : ''}${first.reason}` })
      }
    },
    [push],
  )
}

/**
 * Selecting rows and deleting them, one by one (the trash icon) or many at once (select all, then Delete). The website's
 * and the Windows app's lists share it. Whoever lacks the Delete tick sees none of it.
 */
export function useDocumentDeletion(rows: SaleDocument[], type: IssuableType) {
  const { can } = usePermissions()
  const queryClient = useQueryClient()
  const { push } = useToast()
  const report = useBulkReport()
  const mayDelete = can(docPermission(type, 'delete'))
  const [selected, setSelected] = useState<number[]>([])
  const [asking, setAsking] = useState<number[] | null>(null)

  // A selection never keeps rows that left the page (another page, a search, a delete).
  useEffect(() => {
    const here = new Set(rows.map((row) => row.id))
    setSelected((current) => {
      const next = current.filter((id) => here.has(id))
      return next.length === current.length ? current : next
    })
  }, [rows])

  const deleting = useMutation({
    mutationFn: (ids: number[]) => bulkDeleteSales(ids),
    onSuccess: (result) => {
      setAsking(null)
      setSelected((current) => current.filter((id) => !result.done.includes(id)))
      refreshAfterDeleteOrRestore(queryClient)
      report(result, (count) => t('sales.bulkDeleted', '{count} deleted. You can restore them from the Restore page.', { count }))
    },
    onError: (error) => {
      setAsking(null)
      push({ tone: 'danger', title: getErrorMessage(error) })
    },
  })

  const selectable = rows.map((row) => row.id)
  const allSelected = selectable.length > 0 && selectable.every((id) => selected.includes(id))

  function toggle(id: number) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  function toggleAll() {
    setSelected(allSelected ? [] : selectable)
  }

  const single = asking && asking.length === 1 ? rows.find((row) => row.id === asking[0]) : null
  const dialog: ReactNode = (
    <ConfirmDialog
      open={asking !== null}
      loading={deleting.isPending}
      tone="danger"
      title={
        single
          ? t('sales.deleteTitle', 'Delete {number}?', { number: single.number })
          : t('sales.deleteManyTitle', 'Delete {count} documents?', { count: asking?.length ?? 0 })
      }
      description={t(
        'sales.deleteManyBody',
        'They leave your lists and reports, and any stock they took comes back. Numbers are never reused. A paid document cannot be deleted. You can restore them from the Restore page.',
      )}
      confirmLabel={t('sales.delete', 'Delete')}
      onClose={() => setAsking(null)}
      onConfirm={() => {
        if (asking) deleting.mutate(asking)
      }}
    />
  )

  return {
    mayDelete,
    selected,
    isSelected: (id: number) => selected.includes(id),
    toggle,
    allSelected,
    someSelected: selected.length > 0 && !allSelected,
    toggleAll,
    clear: () => setSelected([]),
    ask: (ids: number[]) => setAsking(ids),
    busy: deleting.isPending,
    dialog,
  }
}

export type DocumentDeletion = ReturnType<typeof useDocumentDeletion>

/** The checkbox at the head of a column and on every row. */
export function SelectBox({ checked, indeterminate, onChange, label }: { checked: boolean; indeterminate?: boolean; onChange: () => void; label: string }) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      ref={(element) => {
        if (element) element.indeterminate = Boolean(indeterminate)
      }}
      onChange={onChange}
      onClick={(event) => event.stopPropagation()}
      className="h-4 w-4 cursor-pointer rounded border-line accent-brand-600"
    />
  )
}

/** "3 selected · Delete · Clear" over a list, shown only while something is selected. */
export function SelectionBar({
  count,
  onAction,
  onClear,
  busy,
  actionLabel,
  tone = 'danger',
}: {
  count: number
  onAction: () => void
  onClear: () => void
  busy?: boolean
  actionLabel: string
  tone?: 'danger' | 'brand'
}) {
  if (count === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-line/70 bg-brand-600/6 px-4 py-2.5 text-[13px]">
      <span className="font-semibold text-ink">{t('sales.selectedCount', '{count} selected', { count })}</span>
      <button
        type="button"
        disabled={busy}
        onClick={onAction}
        className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-white disabled:opacity-60 ${tone === 'danger' ? 'bg-rose-600' : 'bg-brand-600'}`}
      >
        {tone === 'danger' ? <Trash2 className="h-3.5 w-3.5" /> : null}
        {actionLabel}
      </button>
      <button type="button" onClick={onClear} className="cursor-pointer text-xs font-semibold text-ink-muted hover:text-ink">
        {t('sales.clearSelection', 'Clear')}
      </button>
    </div>
  )
}

/** The trash icon on a row: greyed out, with the reason on hover, when this document cannot be deleted. */
export function DeleteIcon({ document, onClick, className }: { document: SaleDocument; onClick: () => void; className: string }) {
  const blocked = document.can_delete === false
  const label = blocked ? (document.delete_blocked ?? t('sales.delete', 'Delete')) : t('sales.delete', 'Delete')
  return (
    <button
      type="button"
      title={label}
      aria-label={`${t('sales.delete', 'Delete')} ${document.number}`}
      aria-disabled={blocked}
      onClick={(event) => {
        event.stopPropagation()
        if (!blocked) onClick()
      }}
      className={`${className} ${blocked ? 'cursor-not-allowed opacity-35' : 'hover:bg-rose-500/10 hover:text-rose-600'}`}
    >
      <Trash2 className="h-4 w-4" />
    </button>
  )
}
