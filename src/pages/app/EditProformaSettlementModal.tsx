import { Minus, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { t } from '../../i18n'
import { formatCents } from '../../lib/money'
import type { SaleLine, SaleSettlement } from '../../types/sales'

type DraftLine = {
  lineId: number
  article: string
  /** The most this payment can cover: what is still open, plus what it already covers. */
  max: number
  quantity: number
  /** What it covered when the screen opened. */
  was: number
  unitPrice: number
}

type EditProformaSettlementModalProps = {
  open: boolean
  loading?: boolean
  settlement: SaleSettlement | null
  lines: SaleLine[]
  currency: string
  onClose: () => void
  onConfirm: (lines: { line_id: number; quantity: number }[]) => void
}

function remainingOf(line: SaleLine): number {
  return line.remaining_quantity ?? Math.max(0, line.quantity - (line.settled_quantity ?? 0) - (line.returned_quantity ?? 0))
}

function buildDrafts(settlement: SaleSettlement | null, lines: SaleLine[]): DraftLine[] {
  if (!settlement) return []
  const byId = new Map(lines.filter((line) => line.id != null).map((line) => [line.id as number, line]))

  return (settlement.lines ?? []).map((row) => {
    const documentLine = byId.get(row.line_id)
    return {
      lineId: row.line_id,
      article: documentLine?.article ?? t('sales.article', 'Article'),
      max: (documentLine ? remainingOf(documentLine) : 0) + row.quantity,
      quantity: row.quantity,
      was: row.quantity,
      unitPrice: row.unit_price,
    }
  })
}

/** Change how many pieces one payment covers. The price of each piece stays as it was paid. */
export function EditProformaSettlementModal({
  open,
  loading = false,
  settlement,
  lines,
  currency,
  onClose,
  onConfirm,
}: EditProformaSettlementModalProps) {
  const seeded = useMemo(() => buildDrafts(settlement, lines), [settlement, lines])
  const [drafts, setDrafts] = useState<DraftLine[]>(seeded)
  const rows = drafts.length > 0 ? drafts : seeded

  useEffect(() => {
    if (!open) {
      setDrafts([])
      return
    }
    setDrafts(buildDrafts(settlement, lines))
  }, [open, settlement, lines])

  function move(lineId: number, next: number) {
    setDrafts((current) =>
      (current.length > 0 ? current : seeded).map((row) =>
        row.lineId === lineId ? { ...row, quantity: Math.min(row.max, Math.max(1, next)) } : row,
      ),
    )
  }

  const before = rows.reduce((sum, row) => sum + row.was * row.unitPrice, 0)
  const after = rows.reduce((sum, row) => sum + row.quantity * row.unitPrice, 0)
  const changed = rows.some((row) => row.quantity !== row.was)
  const ready = rows.length > 0 && rows.every((row) => row.quantity >= 1 && row.quantity <= row.max)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('sales.editQuantity', 'Edit quantity')}
      subtitle={t('sales.editQuantityHint', 'Change how many pieces this payment covers. The price stays the same.')}
      maxWidth="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            loading={loading}
            disabled={!ready || !changed}
            onClick={() => onConfirm(rows.map((row) => ({ line_id: row.lineId, quantity: row.quantity })))}
          >
            {t('common.save', 'Save')}
          </Button>
        </>
      }
    >
      {rows.length === 0 ? (
        <p className="text-sm text-ink-muted">{t('common.loading', 'Loading')}</p>
      ) : (
        <div className="flex flex-col gap-4">
          <ul className="divide-y divide-line rounded-xl border border-line">
            {rows.map((row) => (
              <li key={row.lineId} className="flex flex-wrap items-center gap-3 px-3 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{row.article}</span>
                  <span className="text-[11px] text-ink-muted">
                    {formatCents(row.unitPrice, currency)} · {t('sales.editQuantityMax', 'up to {max} pieces', { max: row.max })}
                  </span>
                </span>
                <span className="inline-flex items-center overflow-hidden rounded-lg border border-line" role="group" aria-label={row.article}>
                  <button
                    type="button"
                    disabled={row.quantity <= 1}
                    onClick={() => move(row.lineId, row.quantity - 1)}
                    className="cursor-pointer p-2 text-ink-muted hover:bg-page disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={t('common.previous', 'Previous')}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-10 text-center text-sm font-bold text-ink" aria-live="polite">
                    {row.quantity}
                  </span>
                  <button
                    type="button"
                    disabled={row.quantity >= row.max}
                    onClick={() => move(row.lineId, row.quantity + 1)}
                    className="cursor-pointer p-2 text-ink-muted hover:bg-page disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={t('common.next', 'Next')}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </span>
                <span className="w-24 text-right text-sm font-bold text-ink">{formatCents(row.quantity * row.unitPrice, currency)}</span>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between rounded-xl bg-page px-4 py-3">
            <span className="text-xs text-ink-muted">{t('sales.thisPayment', 'This payment')}</span>
            <span className="flex items-baseline gap-2 text-right">
              {changed ? <span className="text-xs text-ink-muted line-through">{formatCents(before, currency)}</span> : null}
              <span className="text-base font-bold text-ink">{formatCents(after, currency)}</span>
            </span>
          </div>
        </div>
      )}
    </Modal>
  )
}
