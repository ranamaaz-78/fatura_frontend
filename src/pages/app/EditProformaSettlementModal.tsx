import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { t } from '../../i18n'
import { formatCents } from '../../lib/money'
import type { SaleLine, SaleSettlement } from '../../types/sales'

type DraftLine = {
  lineId: number
  article: string
  max: number
  quantity: number
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
  return line.remaining_quantity ?? Math.max(0, line.quantity - (line.settled_quantity ?? 0))
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
      unitPrice: row.unit_price,
    }
  })
}

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

  const runningCents = useMemo(
    () => rows.reduce((sum, row) => sum + row.quantity * row.unitPrice, 0),
    [rows],
  )

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
            disabled={!ready}
            onClick={() =>
              onConfirm(rows.map((row) => ({ line_id: row.lineId, quantity: row.quantity })))
            }
          >
            {t('common.save', 'Save')}
          </Button>
        </>
      }
    >
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">{t('common.loading', 'Loading')}</p>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-right text-sm font-bold text-slate-900">
            {t('sales.thisPayment', 'This payment')} {formatCents(runningCents, currency)}
          </p>
          {rows.map((row) => (
            <div key={row.lineId} className="flex flex-col gap-2 rounded-xl border border-slate-200 px-3 py-3 sm:flex-row sm:items-center">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-800">{row.article}</span>
                <span className="text-[11px] text-slate-400">
                  {formatCents(row.unitPrice, currency)} · {row.max} {t('sales.left', 'left')}
                </span>
              </span>
              <Input
                compact
                type="number"
                min={1}
                max={row.max}
                value={row.quantity}
                onChange={(event) => {
                  const next = Number(event.target.value)
                  if (!Number.isFinite(next)) return
                  setDrafts((current) =>
                    current.map((item) =>
                      item.lineId === row.lineId
                        ? { ...item, quantity: Math.min(row.max, Math.max(1, Math.round(next))) }
                        : item,
                    ),
                  )
                }}
                className="sm:w-24"
              />
              <span className="text-right text-sm font-bold text-slate-900 sm:w-24">
                {formatCents(row.quantity * row.unitPrice, currency)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
