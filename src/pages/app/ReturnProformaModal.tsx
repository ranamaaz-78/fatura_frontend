import { Minus, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Checkbox } from '../../components/ui/Checkbox'
import { Modal } from '../../components/ui/Modal'
import { Textarea } from '../../components/ui/Textarea'
import { t } from '../../i18n'
import { formatCents } from '../../lib/money'
import type { SaleLine, SaleReturnInput } from '../../types/sales'

type DraftLine = {
  lineId: number
  article: string
  remaining: number
  unitPrice: number
  selected: boolean
  quantity: number
}

type ReturnProformaModalProps = {
  open: boolean
  loading?: boolean
  lines: SaleLine[]
  currency: string
  onClose: () => void
  onConfirm: (input: SaleReturnInput) => void
}

function remainingOf(line: SaleLine): number {
  return line.remaining_quantity ?? Math.max(0, line.quantity - (line.settled_quantity ?? 0) - (line.returned_quantity ?? 0))
}

/** Only the pieces that are still open can come back: not paid for yet, and not returned before. */
function buildDrafts(lines: SaleLine[]): DraftLine[] {
  return lines
    .filter((line) => line.id != null && remainingOf(line) > 0)
    .map((line) => ({
      lineId: line.id as number,
      article: line.article,
      remaining: remainingOf(line),
      unitPrice: line.unit_price,
      selected: false,
      quantity: 1,
    }))
}

/** Pick the pieces that came back. They go back into stock and stop counting as owed. */
export function ReturnProformaModal({ open, loading = false, lines, currency, onClose, onConfirm }: ReturnProformaModalProps) {
  const [drafts, setDrafts] = useState<DraftLine[]>([])
  const [note, setNote] = useState('')

  useEffect(() => {
    if (open) {
      setDrafts(buildDrafts(lines))
      setNote('')
    }
  }, [open, lines])

  function patch(lineId: number, change: Partial<DraftLine>) {
    setDrafts((current) => current.map((row) => (row.lineId === lineId ? { ...row, ...change } : row)))
  }

  const chosen = drafts.filter((row) => row.selected)
  const pieces = chosen.reduce((sum, row) => sum + row.quantity, 0)
  const worth = chosen.reduce((sum, row) => sum + row.quantity * row.unitPrice, 0)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('sales.returnTitle', 'Return pieces')}
      subtitle={t('sales.returnSubtitle', 'Pick the pieces that came back. They go back into stock and are no longer owed.')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            loading={loading}
            disabled={chosen.length === 0}
            onClick={() =>
              onConfirm({
                lines: chosen.map((row) => ({ line_id: row.lineId, quantity: row.quantity })),
                note: note.trim() || undefined,
              })
            }
          >
            {t('sales.returnConfirm', 'Return pieces')}
          </Button>
        </>
      }
    >
      {drafts.length === 0 ? (
        <p className="text-sm text-ink-muted">{t('sales.returnNoneLeft', 'There are no open pieces left on this proforma.')}</p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {drafts.map((row) => (
            <li key={row.lineId} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
              <Checkbox
                checked={row.selected}
                onChange={(event) => patch(row.lineId, { selected: event.target.checked })}
                aria-label={row.article}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">{row.article}</span>
                <span className="text-[11px] text-ink-muted">
                  {t('sales.returnOpen', '{count} open', { count: row.remaining })} · {formatCents(row.unitPrice, currency)}
                </span>
              </span>
              <span className="inline-flex items-center overflow-hidden rounded-lg border border-line" aria-label={t('sales.qty', 'Quantity')}>
                <button
                  type="button"
                  disabled={!row.selected || row.quantity <= 1}
                  onClick={() => patch(row.lineId, { quantity: row.quantity - 1 })}
                  className="cursor-pointer p-2 text-ink-muted disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={t('common.previous', 'Previous')}
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-9 text-center text-sm font-bold text-ink">{row.quantity}</span>
                <button
                  type="button"
                  disabled={!row.selected || row.quantity >= row.remaining}
                  onClick={() => patch(row.lineId, { quantity: row.quantity + 1 })}
                  className="cursor-pointer p-2 text-ink-muted disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={t('common.next', 'Next')}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4">
        <Textarea
          label={t('sales.returnNote', 'Note (optional)')}
          rows={2}
          maxLength={500}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>

      {chosen.length > 0 ? (
        <p className="mt-3 text-sm font-semibold text-ink">
          {t('sales.returnSummary', '{pieces} pieces worth {amount} will go back into stock.', {
            pieces,
            amount: formatCents(worth, currency),
          })}
        </p>
      ) : null}
    </Modal>
  )
}
