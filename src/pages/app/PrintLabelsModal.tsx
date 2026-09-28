import { Printer } from 'lucide-react'
import { useState } from 'react'
import { BarcodeSvg } from '../../components/ui/BarcodeSvg'
import { Button } from '../../components/ui/Button'
import { Checkbox } from '../../components/ui/Checkbox'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Select } from '../../components/ui/Select'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { formatCents } from '../../lib/money'
import { LABEL_SHEETS, printLabelSheet, sheetSpec, type LabelSheet } from '../../lib/printLabels'
import type { Product } from '../../types/catalog'

export type PrintLabelsModalProps = {
  open: boolean
  products: Product[]
  currency: string
  onClose: () => void
}

export function PrintLabelsModal({ open, products, currency, onClose }: PrintLabelsModalProps) {
  const { push } = useToast()
  const [sheet, setSheet] = useState<LabelSheet>('a4-24')
  const [copies, setCopies] = useState('8')
  const [showPrice, setShowPrice] = useState(true)
  const [showName, setShowName] = useState(true)
  const [showSku, setShowSku] = useState(false)

  const spec = sheetSpec(sheet)
  const perProduct = Math.max(1, Math.min(200, Number(copies) || 1))
  const total = products.length * perProduct
  const preview = products.slice(0, 6)

  function print() {
    const ok = printLabelSheet(
      products.map((product) => ({
        article: product.article,
        sr_number: product.sr_number,
        barcode: product.barcode,
        selling_price: product.selling_price,
      })),
      { sheet, copies: perProduct, showName, showPrice, showSku, currency },
    )

    if (!ok) {
      push({ tone: 'danger', title: t('labels.blocked', 'Your browser blocked the print window. Allow pop-ups and try again.') })
      return
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      maxWidth="2xl"
      title={t('labels.title', 'Print barcode labels')}
      subtitle={`${products.length} ${t('labels.selected', 'products selected')}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button icon={<Printer className="h-4 w-4" />} disabled={products.length === 0} onClick={print}>
            {t('labels.print', 'Print')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5 md:flex-row">
        <div className="flex w-full shrink-0 flex-col gap-3.5 md:w-60">
          <Select
            compact
            label={t('labels.sheet', 'Label sheet')}
            value={sheet}
            onChange={(event) => setSheet(event.target.value as LabelSheet)}
          >
            {LABEL_SHEETS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
          <Input
            compact
            label={t('labels.copies', 'Copies per product')}
            inputMode="numeric"
            value={copies}
            onChange={(event) => setCopies(event.target.value)}
          />
          <div className="flex flex-col gap-2.5 pt-1">
            <Checkbox
              label={t('labels.showPrice', 'Show price')}
              checked={showPrice}
              onChange={(event) => setShowPrice(event.target.checked)}
            />
            <Checkbox
              label={t('labels.showName', 'Show product name')}
              checked={showName}
              onChange={(event) => setShowName(event.target.checked)}
            />
            <Checkbox
              label={t('labels.showSku', 'Show sr number')}
              checked={showSku}
              onChange={(event) => setShowSku(event.target.checked)}
            />
          </div>
        </div>

        <div className="min-w-0 flex-1 rounded-2xl border border-line bg-page p-3.5">
          <span className="text-[11px] font-bold tracking-[0.08em] text-slate-500 uppercase">
            {t('labels.preview', 'Preview')}
          </span>
          <div className="mt-2.5 grid grid-cols-3 gap-2 rounded-lg bg-card p-2.5">
            {preview.map((product) => (
              <div
                key={product.id}
                className="rounded-md border border-dashed border-slate-300 p-1.5 text-center"
              >
                {showName ? (
                  <span className="block truncate text-[8px] font-bold">{product.article}</span>
                ) : null}
                <BarcodeSvg code={product.barcode} className="mt-1 h-7 w-full" />
                {showSku && product.sr_number ? (
                  <span className="block truncate font-mono text-[7px] text-slate-600">{product.sr_number}</span>
                ) : null}
                {showPrice ? (
                  <span className="block font-mono text-[10px] font-bold">
                    {formatCents(product.selling_price, currency)}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
          <p className="mt-2.5 text-[11px] text-slate-500">
            {total} {t('labels.totalLabels', 'labels')} · {spec.label} ·{' '}
            {t('labels.vectorNote', 'barcodes print as sharp vectors')}
          </p>
        </div>
      </div>
    </Modal>
  )
}
