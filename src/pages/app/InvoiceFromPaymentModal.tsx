import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Select } from '../../components/ui/Select'
import { t } from '../../i18n'
import { formatCents } from '../../lib/money'
import { listRecargoRates, listTaxRates } from '../../services/catalog'
import type { SaleLine, SaleSettlement } from '../../types/sales'

type InvoiceFromPaymentModalProps = {
  open: boolean
  loading?: boolean
  settlement: SaleSettlement | null
  lines: SaleLine[]
  currency: string
  onClose: () => void
  /** IVA percent per proforma line; a line left on "automatic" is not in the map. */
  onConfirm: (iva: Record<number, number>, recargoRateId: number | null) => void
}

/** "Auto" lets the server use each product's own IVA. */
const AUTO = 'auto'

/** The invoice for one payment on a proforma: its pieces and prices, with IVA on top. No stock moves. */
export function InvoiceFromPaymentModal({ open, loading = false, settlement, lines, currency, onClose, onConfirm }: InvoiceFromPaymentModalProps) {
  const [iva, setIva] = useState<Record<number, string>>({})
  const [recargo, setRecargo] = useState('')
  const rates = useQuery({ queryKey: ['app', 'tax-rates'], queryFn: listTaxRates, enabled: open })
  const recargoRates = useQuery({ queryKey: ['app', 'recargo-rates'], queryFn: listRecargoRates, enabled: open })

  useEffect(() => {
    if (open) {
      setIva({})
      setRecargo('')
    }
  }, [open, settlement?.id])

  const byId = new Map(lines.filter((line) => line.id != null).map((line) => [line.id as number, line]))
  const rows = (settlement?.lines ?? []).map((row) => ({ ...row, article: byId.get(row.line_id)?.article ?? t('sales.article', 'Article') }))
  const pieces = rows.reduce((sum, row) => sum + row.quantity, 0)

  function confirm() {
    const chosen: Record<number, number> = {}
    for (const row of rows) {
      const value = iva[row.line_id]
      if (value !== undefined && value !== AUTO) chosen[row.line_id] = Number(value)
    }
    onConfirm(chosen, recargo === '' ? null : Number(recargo))
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('sales.invoiceFromPaymentTitle', 'Invoice for this payment')}
      subtitle={t('sales.invoiceFromPaymentHint', 'Makes an invoice of exactly these pieces and prices. Stock does not change: the proforma already took it out.')}
      maxWidth="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button loading={loading} disabled={rows.length === 0} onClick={confirm}>
            {t('sales.invoiceFromPaymentConfirm', 'Create invoice')}
          </Button>
        </>
      }
    >
      <ul className="divide-y divide-line rounded-xl border border-line">
        {rows.map((row) => (
          <li key={row.line_id} className="flex flex-wrap items-center gap-3 px-3 py-3">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink">{row.article}</span>
              <span className="text-[11px] text-ink-muted">
                {row.quantity} × {formatCents(row.unit_price, currency)}
              </span>
            </span>
            <span className="w-44">
              <Select
                compact
                aria-label={t('sales.iva', '% IVA')}
                value={iva[row.line_id] ?? AUTO}
                onChange={(event) => setIva((current) => ({ ...current, [row.line_id]: event.target.value }))}
              >
                <option value={AUTO}>{t('sales.ivaAuto', 'IVA: the product’s own')}</option>
                {(rates.data ?? []).map((rate) => (
                  <option key={rate.id} value={String(rate.rate)}>
                    {rate.name} · {rate.rate}%
                  </option>
                ))}
              </Select>
            </span>
            <span className="w-24 text-right text-sm font-bold text-ink">{formatCents(row.total_cents, currency)}</span>
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
        <span className="text-xs text-ink-muted">
          {t('sales.invoiceFromPaymentPaid', '{pieces} pieces, paid with {method}', {
            pieces,
            method: settlement?.payment_method?.name ?? t('sales.payment', 'Payment'),
          })}
        </span>
        <span className="text-right">
          <span className="block text-[11px] text-ink-muted">{t('sales.totalWithoutTax', 'Total without tax')}</span>
          <span className="text-base font-bold text-ink">{formatCents(settlement?.total_cents ?? 0, currency)}</span>
        </span>
      </div>
      <p className="mt-2 text-[11px] text-ink-muted">
        {t('sales.invoiceFromPaymentNote', 'IVA (and recargo, if chosen) is added on top of these prices. The invoice is marked as paid.')}
      </p>
    </Modal>
  )
}
