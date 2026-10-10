import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Select } from '../../components/ui/Select'
import { t } from '../../i18n'
import { formatCents } from '../../lib/money'
import { listRecargoRates, listTaxRates } from '../../services/catalog'
import type { SaleLine } from '../../types/sales'

type InvoiceFromAlbaranModalProps = {
  open: boolean
  loading?: boolean
  lines: SaleLine[]
  currency: string
  onClose: () => void
  /** IVA percent per delivery-note line; a line left on "automatic" is not in the map. */
  onConfirm: (iva: Record<number, number>, recargoRateId: number | null) => void
}

/** "Auto" lets the server use each product's own IVA. */
const AUTO = 'auto'

/** A delivery note becomes an invoice: its pieces and prices, with IVA and optionally recargo on top. No stock moves. */
export function InvoiceFromAlbaranModal({ open, loading = false, lines, currency, onClose, onConfirm }: InvoiceFromAlbaranModalProps) {
  const [iva, setIva] = useState<Record<number, string>>({})
  const [recargo, setRecargo] = useState('')
  const rates = useQuery({ queryKey: ['app', 'tax-rates'], queryFn: listTaxRates, enabled: open })
  const recargoRates = useQuery({ queryKey: ['app', 'recargo-rates'], queryFn: listRecargoRates, enabled: open })

  useEffect(() => {
    if (open) {
      setIva({})
      setRecargo('')
    }
  }, [open])

  const rows = lines.filter((line) => line.id != null)
  const base = rows.reduce((sum, line) => sum + line.base_cents, 0)

  function confirm() {
    const chosen: Record<number, number> = {}
    for (const line of rows) {
      const value = iva[line.id as number]
      if (value !== undefined && value !== AUTO) chosen[line.id as number] = Number(value)
    }
    onConfirm(chosen, recargo === '' ? null : Number(recargo))
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('sales.invoiceFromAlbaranTitle', 'Convert to invoice')}
      subtitle={t('sales.invoiceFromAlbaranHint', 'Makes an invoice of this delivery note. Stock does not change: the delivery note already took it out.')}
      maxWidth="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button loading={loading} disabled={rows.length === 0} onClick={confirm}>
            {t('sales.invoiceFromAlbaranConfirm', 'Create invoice')}
          </Button>
        </>
      }
    >
      <ul className="divide-y divide-line rounded-xl border border-line">
        {rows.map((line) => (
          <li key={line.id} className="flex flex-wrap items-center gap-3 px-3 py-3">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink">{line.article}</span>
              <span className="text-[11px] text-ink-muted">
                {line.quantity} × {formatCents(line.unit_price, currency)}
                {line.discount_percent > 0 ? ` · −${line.discount_percent}%` : ''}
              </span>
            </span>
            <span className="w-44">
              <Select
                compact
                aria-label={t('sales.iva', '% IVA')}
                value={iva[line.id as number] ?? AUTO}
                onChange={(event) => setIva((current) => ({ ...current, [line.id as number]: event.target.value }))}
              >
                <option value={AUTO}>{t('sales.ivaAuto', 'IVA: the product’s own')}</option>
                {(rates.data ?? []).map((rate) => (
                  <option key={rate.id} value={String(rate.rate)}>
                    {rate.name} · {rate.rate}%
                  </option>
                ))}
              </Select>
            </span>
            <span className="w-24 text-right text-sm font-bold text-ink">{formatCents(line.base_cents, currency)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4">
        <Select
          compact
          label={t('sales.recargo', 'Recargo de equivalencia')}
          hint={(recargoRates.data ?? []).length === 0 ? t('sales.recargoNone', 'No recargo rates yet.') : undefined}
          value={recargo}
          onChange={(event) => setRecargo(event.target.value)}
        >
          <option value="">{t('sales.noRecargo', 'No recargo')}</option>
          {(recargoRates.data ?? []).map((rate) => (
            <option key={rate.id} value={String(rate.id)}>
              {rate.name} · {rate.rate}%
            </option>
          ))}
        </Select>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl bg-page px-4 py-3">
        <span className="text-xs text-ink-muted">{t('sales.invoiceFromAlbaranPieces', '{count} lines', { count: rows.length })}</span>
        <span className="text-right">
          <span className="block text-[11px] text-ink-muted">{t('sales.totalWithoutTax', 'Total without tax')}</span>
          <span className="text-base font-bold text-ink">{formatCents(base, currency)}</span>
        </span>
      </div>
      <p className="mt-2 text-[11px] text-ink-muted">
        {t('sales.invoiceFromAlbaranNote', 'IVA (and recargo, if chosen) is added on top of these prices. The invoice keeps the payment status of the delivery note.')}
      </p>
    </Modal>
  )
}
