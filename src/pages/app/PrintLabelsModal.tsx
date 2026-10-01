import { AlertTriangle, Printer } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { BarcodeSvg } from '../../components/ui/BarcodeSvg'
import { Button } from '../../components/ui/Button'
import { Checkbox } from '../../components/ui/Checkbox'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Select } from '../../components/ui/Select'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { formatCents } from '../../lib/money'
import {
  CUSTOM_SHEET,
  DEFAULT_CUSTOM,
  LABEL_SHEETS,
  PAGES,
  cleanCustom,
  layoutProblem,
  printLabelSheet,
  resolvedSpec,
  type BarHeight,
  type CustomLabel,
  type LabelSheet,
  type PageSize,
  type TextSize,
} from '../../lib/printLabels'
import type { Product } from '../../types/catalog'

export type PrintLabelsModalProps = {
  open: boolean
  products: Product[]
  currency: string
  onClose: () => void
}

type Saved = {
  sheet: LabelSheet
  turned: boolean
  custom: Record<keyof CustomLabel, string>
  textSize: TextSize
  barHeight: BarHeight
  border: boolean
}

const STORAGE_KEY = 'labels.settings'

const asText = (custom: CustomLabel): Saved['custom'] => ({
  layout: custom.layout,
  width: String(custom.width),
  height: String(custom.height),
  page: custom.page,
  columns: String(custom.columns),
  gap: String(custom.gap),
  margin: String(custom.margin),
})

function loadSaved(): Saved {
  const fallback: Saved = {
    sheet: 'a4-24',
    turned: false,
    custom: asText(DEFAULT_CUSTOM),
    textSize: 'normal',
    barHeight: 'normal',
    border: false,
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<Saved>
    const known = parsed.sheet === CUSTOM_SHEET || LABEL_SHEETS.some((option) => option.id === parsed.sheet)

    return {
      sheet: known && parsed.sheet ? parsed.sheet : fallback.sheet,
      turned: Boolean(parsed.turned),
      custom: { ...fallback.custom, ...(parsed.custom ?? {}) },
      textSize: parsed.textSize ?? 'normal',
      barHeight: parsed.barHeight ?? 'normal',
      border: Boolean(parsed.border),
    }
  } catch {
    return fallback
  }
}

export function PrintLabelsModal({ open, products, currency, onClose }: PrintLabelsModalProps) {
  const { push } = useToast()
  const [saved] = useState(loadSaved)
  const [sheet, setSheet] = useState<LabelSheet>(saved.sheet)
  const [turned, setTurned] = useState(saved.turned)
  const [customText, setCustomText] = useState(saved.custom)
  const [textSize, setTextSize] = useState<TextSize>(saved.textSize)
  const [barHeight, setBarHeight] = useState<BarHeight>(saved.barHeight)
  const [border, setBorder] = useState(saved.border)
  const [copies, setCopies] = useState('8')
  const [showPrice, setShowPrice] = useState(true)
  const [showName, setShowName] = useState(true)
  const [showSku, setShowSku] = useState(false)

  const usingCustom = sheet === CUSTOM_SHEET
  const custom = useMemo(
    () =>
      cleanCustom({
        layout: customText.layout === 'sheet' ? 'sheet' : 'roll',
        width: Number(customText.width),
        height: Number(customText.height),
        page: (customText.page in PAGES ? customText.page : 'A4') as PageSize,
        columns: Number(customText.columns),
        gap: Number(customText.gap),
        margin: Number(customText.margin),
      }),
    [customText],
  )
  const spec = resolvedSpec(sheet, turned, custom)
  const problem = layoutProblem(spec, custom, usingCustom)
  const perProduct = Math.max(1, Math.min(200, Number(copies) || 1))
  const total = products.length * perProduct
  const preview = products.slice(0, spec.roll ? 3 : 6)

  // Remember what the shop prints on, so it is already set next time.
  useEffect(() => {
    try {
      const value: Saved = { sheet, turned, custom: customText, textSize, barHeight, border }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    } catch {
      /* private window: the choice just is not remembered */
    }
  }, [sheet, turned, customText, textSize, barHeight, border])

  function setCustom(field: keyof CustomLabel, value: string) {
    setCustomText((current) => ({ ...current, [field]: value }))
  }

  function print() {
    const ok = printLabelSheet(
      products.map((product) => ({
        article: product.article,
        sr_number: product.sr_number,
        barcode: product.barcode,
        selling_price: product.selling_price,
      })),
      { sheet, copies: perProduct, showName, showPrice, showSku, currency, turned, custom, textSize, barHeight, border },
    )

    if (!ok) {
      push({ tone: 'danger', title: t('labels.blocked', 'Your browser blocked the print window. Allow pop-ups and try again.') })
      return
    }
    onClose()
  }

  // The sample label on screen keeps the real shape of the label.
  const cellStyle = spec.roll
    ? { aspectRatio: `${spec.labelWidth} / ${spec.labelHeight}`, width: `${Math.min(170, Math.max(84, spec.labelWidth * 3.4))}px` }
    : { aspectRatio: `${spec.labelWidth} / ${spec.labelHeight}` }

  return (
    <Modal
      open={open}
      onClose={onClose}
      maxWidth="4xl"
      title={t('labels.title', 'Print barcode labels')}
      subtitle={`${products.length} ${t('labels.selected', 'products selected')}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button icon={<Printer className="h-4 w-4" />} disabled={products.length === 0 || problem !== null} onClick={print}>
            {t('labels.print', 'Print')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5 md:flex-row">
        <div className="flex w-full shrink-0 flex-col gap-3.5 md:w-72">
          <Select
            compact
            label={t('labels.sheet', 'Label size')}
            value={sheet}
            onChange={(event) => setSheet(event.target.value)}
          >
            {LABEL_SHEETS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
            <option value={CUSTOM_SHEET}>{t('labels.custom', 'Custom size…')}</option>
          </Select>

          {usingCustom ? (
            <div className="flex flex-col gap-3 rounded-xl border border-line bg-page/60 p-3">
              <Select
                compact
                label={t('labels.layout', 'Layout')}
                value={customText.layout}
                onChange={(event) => setCustom('layout', event.target.value)}
              >
                <option value="roll">{t('labels.layoutRoll', 'Roll: one label per page')}</option>
                <option value="sheet">{t('labels.layoutSheet', 'Sheet: several labels per page')}</option>
              </Select>
              <div className="grid grid-cols-2 gap-2.5">
                <Input
                  compact
                  type="number"
                  min={8}
                  step="0.5"
                  label={t('labels.width', 'Width (mm)')}
                  value={customText.width}
                  onChange={(event) => setCustom('width', event.target.value)}
                />
                <Input
                  compact
                  type="number"
                  min={6}
                  step="0.5"
                  label={t('labels.height', 'Height (mm)')}
                  value={customText.height}
                  onChange={(event) => setCustom('height', event.target.value)}
                />
              </div>
              {customText.layout === 'sheet' ? (
                <>
                  <Select
                    compact
                    label={t('labels.page', 'Paper')}
                    value={customText.page}
                    onChange={(event) => setCustom('page', event.target.value)}
                  >
                    {(Object.keys(PAGES) as PageSize[]).map((page) => (
                      <option key={page} value={page}>
                        {page} ({PAGES[page].width} × {PAGES[page].height} mm)
                      </option>
                    ))}
                  </Select>
                  <div className="grid grid-cols-3 gap-2.5">
                    <Input
                      compact
                      type="number"
                      min={1}
                      max={12}
                      label={t('labels.columns', 'Per row')}
                      value={customText.columns}
                      onChange={(event) => setCustom('columns', event.target.value)}
                    />
                    <Input
                      compact
                      type="number"
                      min={0}
                      step="0.5"
                      label={t('labels.gap', 'Gap (mm)')}
                      value={customText.gap}
                      onChange={(event) => setCustom('gap', event.target.value)}
                    />
                    <Input
                      compact
                      type="number"
                      min={0}
                      step="0.5"
                      label={t('labels.margin', 'Margin (mm)')}
                      value={customText.margin}
                      onChange={(event) => setCustom('margin', event.target.value)}
                    />
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          {spec.roll ? (
            <div className="flex flex-col gap-1.5">
              <Checkbox
                label={t('labels.turned', 'Turn the label sideways')}
                checked={turned}
                onChange={(event) => setTurned(event.target.checked)}
              />
              <p className="text-[11px] leading-snug text-slate-500">
                {t('labels.rollHint', 'Each label prints on its own page. In the print window set the paper size to')}{' '}
                <strong className="text-slate-700">
                  {spec.labelWidth} × {spec.labelHeight} mm
                </strong>
                {', '}
                {t('labels.rollHint2', 'margins none.')}
              </p>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2.5">
            <Select
              compact
              label={t('labels.textSize', 'Text size')}
              value={textSize}
              onChange={(event) => setTextSize(event.target.value as TextSize)}
            >
              <option value="small">{t('labels.small', 'Small')}</option>
              <option value="normal">{t('labels.normal', 'Normal')}</option>
              <option value="large">{t('labels.large', 'Large')}</option>
            </Select>
            <Select
              compact
              label={t('labels.barHeight', 'Barcode height')}
              value={barHeight}
              onChange={(event) => setBarHeight(event.target.value as BarHeight)}
            >
              <option value="short">{t('labels.short', 'Short')}</option>
              <option value="normal">{t('labels.normal', 'Normal')}</option>
              <option value="tall">{t('labels.tall', 'Tall')}</option>
            </Select>
          </div>

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
            <Checkbox
              label={t('labels.border', 'Draw a border around each label')}
              checked={border}
              onChange={(event) => setBorder(event.target.checked)}
            />
          </div>
        </div>

        <div className="min-w-0 flex-1 rounded-2xl border border-line bg-page p-3.5">
          <span className="text-[11px] font-bold tracking-[0.08em] text-slate-500 uppercase">
            {t('labels.preview', 'Preview')}
          </span>

          {problem ? (
            <div className="mt-2.5 flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {problem}
            </div>
          ) : null}

          <div
            className={
              spec.roll
                ? 'mt-2.5 flex flex-wrap gap-3 rounded-lg bg-card p-3'
                : 'mt-2.5 grid gap-2 rounded-lg bg-card p-2.5'
            }
            style={spec.roll ? undefined : { gridTemplateColumns: `repeat(${Math.min(spec.columns, 4)}, minmax(0, 1fr))` }}
          >
            {preview.map((product) => (
              <div
                key={product.id}
                style={cellStyle}
                className={
                  'flex flex-col items-center justify-center overflow-hidden p-1.5 text-center ' +
                  (border ? 'rounded-md border border-slate-500 bg-white' : 'rounded-md border border-dashed border-slate-300 bg-white')
                }
              >
                {showName ? (
                  <span
                    className="block w-full truncate font-bold"
                    style={{ fontSize: textSize === 'small' ? 7 : textSize === 'large' ? 10 : 8.5 }}
                  >
                    {product.article}
                  </span>
                ) : null}
                <div className="mt-1 w-full" style={{ height: barHeight === 'short' ? 22 : barHeight === 'tall' ? 38 : 30 }}>
                  <BarcodeSvg code={product.barcode} className="h-full w-full" />
                </div>
                {showSku && product.sr_number ? (
                  <span className="block w-full truncate text-slate-600" style={{ fontSize: 7 }}>
                    {product.sr_number}
                  </span>
                ) : null}
                {showPrice ? (
                  <span className="block font-bold" style={{ fontSize: textSize === 'small' ? 9 : textSize === 'large' ? 13 : 11 }}>
                    {formatCents(product.selling_price, currency)}
                  </span>
                ) : null}
              </div>
            ))}
          </div>

          <p className="mt-2.5 text-[11px] text-slate-500">
            {total} {t('labels.totalLabels', 'labels')} · {spec.label}
            {!spec.roll && spec.perSheet > 1 ? ` · ${spec.perSheet} ${t('labels.perPage', 'per page')}` : ''} ·{' '}
            {t('labels.vectorNote', 'barcodes print as sharp vectors')}
          </p>
        </div>
      </div>
    </Modal>
  )
}
