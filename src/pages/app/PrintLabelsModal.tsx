import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Printer } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Checkbox } from '../../components/ui/Checkbox'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Select } from '../../components/ui/Select'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import {
  CUSTOM_SHEET,
  DEFAULT_CUSTOM,
  DEFAULT_DPI,
  GOOD_MODULE_MM,
  LABEL_SHEETS,
  PAGES,
  buildLabelSheet,
  cleanCustom,
  fitLabelOptions,
  layoutProblem,
  printLabelSheet,
  resolvedSpec,
  unavailableChoices,
  type BarHeight,
  type CustomLabel,
  type LabelSheet,
  type PageSize,
  type PrinterDpi,
  type TextSize,
} from '../../lib/printLabels'
import { getErrorMessage } from '../../services/api'
import { markLabelsPrinted } from '../../services/catalog'
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
  dpi: PrinterDpi
  offsetX: string
  offsetY: string
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
    dpi: DEFAULT_DPI,
    offsetX: '0',
    offsetY: '0',
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
      dpi: parsed.dpi === 300 || parsed.dpi === 0 ? parsed.dpi : DEFAULT_DPI,
      offsetX: String(parsed.offsetX ?? '0'),
      offsetY: String(parsed.offsetY ?? '0'),
    }
  } catch {
    return fallback
  }
}

export function PrintLabelsModal({ open, products, currency, onClose }: PrintLabelsModalProps) {
  const { push } = useToast()
  const queryClient = useQueryClient()
  // Every print is remembered per product, so the "labels to print" list knows what is done and what is not.
  const record = useMutation({
    mutationFn: markLabelsPrinted,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['app', 'products'] })
      push({ tone: 'success', title: t('labelQueue.markedPrinted', 'Sent to print and marked as printed.') })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })
  const [saved] = useState(loadSaved)
  const [sheet, setSheet] = useState<LabelSheet>(saved.sheet)
  const [turned, setTurned] = useState(saved.turned)
  const [customText, setCustomText] = useState(saved.custom)
  const [textSize, setTextSize] = useState<TextSize>(saved.textSize)
  const [barHeight, setBarHeight] = useState<BarHeight>(saved.barHeight)
  const [border, setBorder] = useState(saved.border)
  const [dpi, setDpi] = useState<PrinterDpi>(saved.dpi)
  // Lines the content up on the roll when the paper feeds a little off: millimetres right and down.
  const [offsetX, setOffsetX] = useState(saved.offsetX)
  const [offsetY, setOffsetY] = useState(saved.offsetY)
  const [copies, setCopies] = useState('8')
  const [showPrice, setShowPrice] = useState(true)
  const [showName, setShowName] = useState(true)

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
  const preview = products.slice(0, spec.roll ? 3 : 4)

  // A roll label only prints what fits it. What does not is left off here and switched off below, never squeezed in.
  const fit = fitLabelOptions(spec, { showName, showPrice, textSize, barHeight }, dpi)
  const blocked = unavailableChoices(spec, fit.options)
  const leftOff = fit.changed
    .filter((key) => key === 'showName' || key === 'showPrice' || key === 'textSize' || key === 'barHeight')
    .map((key) =>
      key === 'showName'
        ? t('labels.fieldName', 'name')
        : key === 'showPrice'
          ? t('labels.fieldPrice', 'price')
          : key === 'textSize'
            ? t('labels.fieldTextSize', 'text size')
            : t('labels.fieldBarHeight', 'barcode height'),
    )
  const thin = spec.roll && fit.fits && fit.module < GOOD_MODULE_MM && dpi !== 0

  const shiftX = Math.max(-5, Math.min(5, Number(offsetX.replace(',', '.')) || 0))
  const shiftY = Math.max(-5, Math.min(5, Number(offsetY.replace(',', '.')) || 0))
  const printOptions = {
    sheet,
    copies: perProduct,
    showName,
    showPrice,
    currency,
    turned,
    custom,
    textSize,
    barHeight,
    border,
    dpi,
    offsetX: shiftX,
    offsetY: shiftY,
  }
  // The preview is the page that will print, drawn by the same code, so what is seen is what comes out.
  const previewHtml = useMemo(
    () =>
      buildLabelSheet(
        preview.map((product) => ({ article: product.article, barcode: product.barcode, selling_price: product.selling_price })),
        { ...printOptions, copies: 1 },
      ).replace('</style>', 'body{background:#fff;padding:1px} .label{outline:1px dashed #cbd5e1;background:#fff}</style>'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [products, sheet, turned, custom, showName, showPrice, textSize, barHeight, border, dpi, currency, shiftX, shiftY],
  )

  // Remember what the shop prints on, so it is already set next time.
  useEffect(() => {
    try {
      const value: Saved = { sheet, turned, custom: customText, textSize, barHeight, border, dpi, offsetX, offsetY }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    } catch {
      /* private window: the choice just is not remembered */
    }
  }, [sheet, turned, customText, textSize, barHeight, border, dpi, offsetX, offsetY])

  function setCustom(field: keyof CustomLabel, value: string) {
    setCustomText((current) => ({ ...current, [field]: value }))
  }

  function print() {
    const ok = printLabelSheet(
      products.map((product) => ({
        article: product.article,
        barcode: product.barcode,
        selling_price: product.selling_price,
      })),
      printOptions,
    )

    if (!ok) {
      push({ tone: 'danger', title: t('labels.blocked', 'Your browser blocked the print window. Allow pop-ups and try again.') })
      return
    }
    // The browser cannot say whether paper came out; sending it to print is what counts as printed.
    record.mutate(products.map((product) => product.id))
    onClose()
  }

  // The preview page is drawn at the label's real size in millimetres, then scaled up to be seen.
  const MM = 3.7795
  const pageWidth = spec.columns * spec.labelWidth + (spec.columns - 1) * spec.gap
  const rowsShown = spec.roll ? preview.length : Math.max(1, Math.ceil(preview.length / spec.columns))
  const pageHeight = rowsShown * spec.labelHeight + (rowsShown - 1) * spec.gap
  const zoom = Math.min(6, Math.max(1, 420 / (pageWidth * MM)))

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
          <Button icon={<Printer className="h-4 w-4" />} disabled={products.length === 0 || problem !== null || !fit.fits} onClick={print}>
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
            <option value={CUSTOM_SHEET}>{t('labels.custom', 'Other size (custom)…')}</option>
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
              <option value="large" disabled={blocked.large}>
                {t('labels.large', 'Large')}
                {blocked.large ? ` ${t('labels.tooBig', '(too big for this label)')}` : ''}
              </option>
            </Select>
            <Select
              compact
              label={t('labels.barHeight', 'Barcode height')}
              value={barHeight}
              onChange={(event) => setBarHeight(event.target.value as BarHeight)}
            >
              <option value="short">{t('labels.short', 'Short')}</option>
              <option value="normal">{t('labels.normal', 'Normal')}</option>
              <option value="tall" disabled={blocked.tall}>
                {t('labels.tall', 'Tall')}
                {blocked.tall ? ` ${t('labels.tooBig', '(too big for this label)')}` : ''}
              </option>
            </Select>
          </div>

          <Select
            compact
            label={t('labels.dpi', 'Printer resolution')}
            value={String(dpi)}
            onChange={(event) => setDpi(Number(event.target.value) as PrinterDpi)}
          >
            <option value="203">{t('labels.dpi203', '203 dpi (most label printers)')}</option>
            <option value="300">{t('labels.dpi300', '300 dpi')}</option>
            <option value="0">{t('labels.dpi0', 'Laser or inkjet')}</option>
          </Select>

          {spec.roll ? (
            <div className="grid grid-cols-2 gap-2.5">
              <Input
                compact
                label={t('labels.shiftX', 'Move right (mm)')}
                inputMode="decimal"
                value={offsetX}
                onChange={(event) => setOffsetX(event.target.value)}
              />
              <Input
                compact
                label={t('labels.shiftY', 'Move down (mm)')}
                inputMode="decimal"
                value={offsetY}
                onChange={(event) => setOffsetY(event.target.value)}
              />
            </div>
          ) : null}

          {!fit.fits ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-900">
              {t('labels.tooShort', 'This label is too short for a barcode that scans. Pick a taller label.')}
            </p>
          ) : null}
          {leftOff.length > 0 ? (
            <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
              {t('labels.leftOff', 'Left off because it does not fit this label: :things.').replace(':things', leftOff.join(', '))}
            </p>
          ) : null}
          {thin ? (
            <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
              {t('labels.thinBars', 'The thinnest bar is :mm mm on this label. Many scanners struggle below 0.19 mm: a wider label scans better.').replace(':mm', fit.module.toFixed(3))}
            </p>
          ) : null}

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
              checked={fit.options.showPrice}
              disabled={blocked.showPrice}
              onChange={(event) => setShowPrice(event.target.checked)}
            />
            <Checkbox
              label={t('labels.showName', 'Show product name')}
              checked={fit.options.showName}
              disabled={blocked.showName}
              onChange={(event) => setShowName(event.target.checked)}
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

          <div className="mt-2.5 overflow-auto rounded-lg bg-card p-3">
            <div style={{ width: pageWidth * MM * zoom + 2, height: pageHeight * MM * zoom + 2 }}>
              <iframe
                title={t('labels.preview', 'Preview')}
                srcDoc={previewHtml}
                sandbox=""
                tabIndex={-1}
                style={{
                  width: pageWidth * MM + 2,
                  height: pageHeight * MM + 2,
                  border: 0,
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                  display: 'block',
                  background: '#fff',
                }}
              />
            </div>
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
