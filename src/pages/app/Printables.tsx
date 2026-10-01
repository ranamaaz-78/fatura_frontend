import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Printer, Upload } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { FileDropzone } from '../../components/ui/FileDropzone'
import { Select } from '../../components/ui/Select'
import { Tabs } from '../../components/ui/Tabs'
import { Textarea } from '../../components/ui/Textarea'
import { Toggle } from '../../components/ui/Toggle'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { ensurePrintFonts } from '../../lib/printFonts'
import { A4_CSS_HEIGHT, A4_CSS_WIDTH } from '../../lib/downloadSheetImage'
import { getErrorMessage } from '../../services/api'
import {
  copyPrintTemplate,
  deleteCompanyLogo,
  getPrintTemplates,
  loadLogoBlob,
  resetPrintTemplate,
  savePrintTemplate,
  uploadCompanyLogo,
} from '../../services/printables'
import type { Company } from '../../types/module01'
import type { PrintableType, PrintTemplate, PrintTemplateInput } from '../../types/printables'
import { PRINT_FONTS, PRINTABLE_TYPES } from '../../types/printables'
import type { SaleDocument, SaleLine } from '../../types/sales'
import { PrintSheet } from './printSheets'

const headerButton =
  'inline-flex h-[38px] items-center gap-2 rounded-xl px-3.5 text-xs font-semibold transition-colors cursor-pointer'

function typeLabel(type: PrintableType): string {
  if (type === 'factura') return t('nav.invoices', 'Invoices')
  if (type === 'albaran') return t('nav.deliveryNotes', 'Delivery notes')
  if (type === 'quotation') return t('nav.quotes', 'Quotes')
  return t('nav.proformas', 'Proformas')
}

function sampleNumber(type: PrintableType): string {
  if (type === 'factura') return 'F-2026/0001'
  if (type === 'albaran') return 'AL-2026/0001'
  if (type === 'quotation') return 'Q-2026/0001'
  return 'PF-2026/0001'
}

function sampleLines(type: PrintableType): SaleLine[] {
  const withTax = type === 'factura' || type === 'quotation'
  return [
    {
      position: 1,
      product_id: null,
      sr_number: 'SR-104',
      article: 'USB-C cable 2 m',
      description: null,
      quantity: 2,
      unit_price: 850,
      discount_percent: 0,
      iva_percent: withTax ? 21 : 0,
      base_cents: 1700,
      tax_cents: withTax ? 357 : 0,
      total_cents: withTax ? 2057 : 1700,
    },
    {
      position: 2,
      product_id: null,
      sr_number: null,
      article: 'Wireless mouse',
      description: null,
      quantity: 1,
      unit_price: 1200,
      discount_percent: 0,
      iva_percent: withTax ? 21 : 0,
      base_cents: 1200,
      tax_cents: withTax ? 252 : 0,
      total_cents: withTax ? 1452 : 1200,
    },
  ]
}

function sampleDocument(type: PrintableType): SaleDocument {
  const lines = sampleLines(type)
  const base = lines.reduce((sum, line) => sum + line.base_cents, 0)
  const tax = lines.reduce((sum, line) => sum + line.tax_cents, 0)
  return {
    id: 0,
    type,
    number: sampleNumber(type),
    issued_at: new Date().toISOString(),
    expires_at: type === 'quotation' ? new Date(Date.now() + 7 * 86_400_000).toISOString() : null,
    is_expired: false,
    payment_status: 'pending',
    payment_method_id: null,
    payment_method: null,
    voided_at: null,
    void_reason: null,
    is_voided: false,
    converted_to_id: null,
    converted_at: null,
    is_converted: false,
    customer_id: null,
    client_code: 'C-0001',
    client_name: 'Adeel Khan',
    client_company: 'Khan Supplies',
    client_phone: '+34 600 123 456',
    client_nif: 'B12345678',
    client_nie: null,
    client_address: 'Calle Mayor 12, 28013 Madrid',
    notes: t('printables.sampleNote', 'Sample note printed on this document.'),
    base_cents: base,
    tax_cents: tax,
    discount_type: null,
    discount_value: null,
    discount_cents: 0,
    recargo_percent: null,
    recargo_cents: 0,
    total_cents: base + tax,
    settled_cents: 0,
    is_partial: false,
    lines,
  }
}

function toInput(row: PrintTemplate): PrintTemplateInput {
  return {
    primary_color: row.primary_color,
    font_key: row.font_key,
    footer_notes: row.footer_notes,
    notes: row.notes,
    show_logo: row.show_logo,
    show_signature: row.show_signature,
  }
}

function isHex(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value)
}

function SheetPreview({
  document,
  company,
  currency,
  theme,
  logoSrc,
}: {
  document: SaleDocument
  company: Company | null
  currency: string
  theme: PrintTemplate
  logoSrc: string | null
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const node = wrapRef.current
    if (!node) return

    function measure() {
      if (!wrapRef.current) return
      setScale(Math.min(1, wrapRef.current.clientWidth / A4_CSS_WIDTH))
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={wrapRef} className="overflow-hidden rounded-2xl border border-line/80 bg-page shadow-xs">
      <div className="overflow-hidden" style={{ height: A4_CSS_HEIGHT * scale }}>
        <div style={{ width: A4_CSS_WIDTH, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          <PrintSheet document={document} company={company} currency={currency} theme={theme} logoSrc={logoSrc} />
        </div>
      </div>
    </div>
  )
}

function Printables() {
  const { session, refresh } = useAuth()
  const { push } = useToast()
  const queryClient = useQueryClient()
  const company = session?.company ?? null
  const currency = company?.currency ?? 'USD'

  const [type, setType] = useState<PrintableType>('factura')
  const [drafts, setDrafts] = useState<Record<PrintableType, PrintTemplateInput> | null>(null)
  const [confirm, setConfirm] = useState<'reset' | 'copy' | null>(null)

  const query = useQuery({ queryKey: ['app', 'print-templates'], queryFn: getPrintTemplates })
  const logoUrl = query.data?.logo_url ?? company?.logo_url ?? null
  const logoBlob = useQuery({
    queryKey: ['app', 'print-logo', logoUrl],
    queryFn: () => loadLogoBlob(logoUrl),
    enabled: Boolean(logoUrl),
  })

  useEffect(() => {
    if (!query.data || drafts) return
    const next = {} as Record<PrintableType, PrintTemplateInput>
    for (const row of query.data.templates) next[row.type] = toInput(row)
    setDrafts(next)
  }, [query.data, drafts])

  async function applyPayload(payload: Awaited<ReturnType<typeof getPrintTemplates>>) {
    queryClient.setQueryData(['app', 'print-templates'], payload)
    const next = {} as Record<PrintableType, PrintTemplateInput>
    for (const row of payload.templates) next[row.type] = toInput(row)
    setDrafts(next)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['app', 'image-blob'] }),
      queryClient.invalidateQueries({ queryKey: ['app', 'print-logo'] }),
    ])
  }

  const save = useMutation({
    mutationFn: () => savePrintTemplate(type, drafts![type]),
    onSuccess: async (payload) => {
      await applyPayload(payload)
      push({ tone: 'success', title: t('printables.saved', 'Printable saved.') })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const reset = useMutation({
    mutationFn: () => resetPrintTemplate(type),
    onSuccess: async (payload) => {
      setConfirm(null)
      await applyPayload(payload)
      push({ tone: 'success', title: t('printables.resetDone', 'Reset to YK Digital Solutions defaults.') })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const copy = useMutation({
    mutationFn: async () => {
      await savePrintTemplate(type, drafts![type])
      return copyPrintTemplate(type, PRINTABLE_TYPES.filter((item) => item !== type))
    },
    onSuccess: async (payload) => {
      setConfirm(null)
      await applyPayload(payload)
      push({ tone: 'success', title: t('printables.copied', 'Copied to the other printables.') })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const logoUp = useMutation({
    mutationFn: (file: File) => uploadCompanyLogo(file),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['app', 'print-templates'] })
      await refresh()
      push({ tone: 'success', title: t('printables.logoSaved', 'Logo saved.') })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const logoOff = useMutation({
    mutationFn: deleteCompanyLogo,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['app', 'print-templates'] })
      await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['app', 'image-blob'] }),
      queryClient.invalidateQueries({ queryKey: ['app', 'print-logo'] }),
    ])
      await refresh()
      push({ tone: 'success', title: t('printables.logoRemoved', 'Logo removed.') })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const draft = drafts?.[type]
  const saved = query.data?.templates.find((row) => row.type === type)
  const previewTheme: PrintTemplate | null = draft
    ? { type, ...draft }
    : saved ?? null
  // The preview prints the note being typed, or a sample line while there is none.
  const draftNotes = draft?.notes.trim() ?? ''
  const sample = useMemo(
    () => ({
      ...sampleDocument(type),
      notes: draftNotes || t('printables.sampleNote', 'Sample note printed on this document.'),
    }),
    [type, draftNotes],
  )
  const canSave = Boolean(draft && isHex(draft.primary_color))

  useEffect(() => {
    ensurePrintFonts(previewTheme?.font_key)
  }, [previewTheme?.font_key])

  function patch(partial: Partial<PrintTemplateInput>) {
    setDrafts((current) => {
      if (!current) return current
      return { ...current, [type]: { ...current[type], ...partial } }
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-line/80 bg-card p-6 shadow-xs sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <Printer className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-[-0.02em] text-slate-900">
              {t('nav.printables', 'Printables')}
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              {t('printables.subtitle', 'Logo, colour, font and terms for invoices, delivery notes, quotes and proformas.')}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-line/80 bg-card p-4 shadow-xs">
        <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
          {t('printables.logo', 'Company logo')}
        </p>
        <p className="mt-0.5 text-xs text-slate-400">
          {t('printables.logoHint', 'Shown on invoices, quotes and proformas when “Show logo” is on; without a logo, your initials are shown instead. Delivery notes carry no company details at all.')}
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-line bg-page">
            {logoBlob.data ? (
              <img src={logoBlob.data} alt="" className="h-full w-full object-contain" />
            ) : (
              <Upload className="h-5 w-5 text-slate-300" />
            )}
          </span>
          <FileDropzone
            accept="image/jpeg,image/png,image/webp"
            disabled={logoUp.isPending}
            onFile={(file) => logoUp.mutate(file)}
          >
            <p className="text-xs font-semibold text-slate-700">
              {t('printables.dropLogo', 'Drop a logo or click to upload')}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">{t('printables.logoTypes', 'JPEG, PNG or WebP · 5 MB max')}</p>
          </FileDropzone>
          {logoUrl ? (
            <button
              type="button"
              disabled={logoOff.isPending}
              onClick={() => logoOff.mutate()}
              className={cn(headerButton, 'bg-slate-100 text-slate-700 hover:bg-slate-200')}
            >
              {t('printables.removeLogo', 'Remove')}
            </button>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-line/80 bg-card shadow-xs">
        <div className="px-3 pt-2">
          <Tabs
            variant="pill"
            value={type}
            onChange={(id) => setType(id as PrintableType)}
            items={PRINTABLE_TYPES.map((item) => ({ id: item, label: typeLabel(item) }))}
          />
        </div>

        {query.isPending || !draft || !previewTheme ? (
          <div className="h-64 animate-pulse bg-slate-50" />
        ) : (
          <div className="grid gap-6 p-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
            <div className="flex flex-col gap-4">
              <label className="text-[11px] font-semibold text-slate-600">
                {t('printables.color', 'Primary colour')}
                <span className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    value={isHex(draft.primary_color) ? draft.primary_color : '#004ac6'}
                    onChange={(event) => patch({ primary_color: event.target.value })}
                    className="h-[38px] w-12 cursor-pointer rounded-lg border border-line bg-card p-1"
                  />
                  <input
                    value={draft.primary_color}
                    onChange={(event) => patch({ primary_color: event.target.value })}
                    className="h-[38px] min-w-0 flex-1 rounded-xl border border-line bg-card px-3 text-[13px] text-ink outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                  />
                </span>
              </label>

              <Select
                compact
                label={t('printables.font', 'Font')}
                value={draft.font_key}
                onChange={(event) => patch({ font_key: event.target.value as PrintTemplateInput['font_key'] })}
              >
                {PRINT_FONTS.map((font) => (
                  <option key={font.key} value={font.key}>
                    {font.label}
                  </option>
                ))}
              </Select>

              <Textarea
                compact
                rows={4}
                maxLength={2000}
                label={t('printables.notesField', 'Notes')}
                hint={t(
                  'printables.notesHint',
                  'Added to every new document of this type and printed under Notes. It can only be changed here.',
                )}
                value={draft.notes}
                onChange={(event) => patch({ notes: event.target.value })}
              />

              <Textarea
                compact
                rows={5}
                label={t('printables.termsField', 'Terms and notes')}
                hint={t('printables.termsHint', 'Printed on every document of this type, under the notes.')}
                value={draft.footer_notes}
                onChange={(event) => patch({ footer_notes: event.target.value })}
              />

              {type !== 'albaran' ? (
                <Toggle
                  checked={draft.show_logo}
                  onChange={(checked) => patch({ show_logo: checked })}
                  label={t('printables.showLogo', 'Show logo')}
                />
              ) : null}
              <Toggle
                checked={draft.show_signature}
                onChange={(checked) => patch({ show_signature: checked })}
                label={t('printables.showSignature', 'Show signature line')}
              />

              <div className="flex flex-wrap gap-2 pt-1">
                <Button disabled={!canSave || save.isPending} loading={save.isPending} onClick={() => save.mutate()}>
                  {t('common.save', 'Save')}
                </Button>
                <Button variant="secondary" onClick={() => setConfirm('copy')}>
                  {t('printables.copyOthers', 'Copy to other types')}
                </Button>
                <Button variant="ghost" onClick={() => setConfirm('reset')}>
                  {t('printables.reset', 'Reset')}
                </Button>
              </div>
            </div>

            <SheetPreview
              document={sample}
              company={company}
              currency={currency}
              theme={previewTheme}
              logoSrc={type !== 'albaran' && draft.show_logo ? (logoBlob.data ?? null) : null}
            />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirm === 'reset'}
        tone="warning"
        loading={reset.isPending}
        title={t('printables.resetTitle', 'Reset this printable?')}
        description={t('printables.resetBody', 'Colour, font, terms and toggles go back to the YK Digital Solutions defaults. The logo is not removed.')}
        confirmLabel={t('printables.reset', 'Reset')}
        onClose={() => setConfirm(null)}
        onConfirm={() => reset.mutate()}
      />
      <ConfirmDialog
        open={confirm === 'copy'}
        tone="warning"
        loading={copy.isPending}
        title={t('printables.copyTitle', 'Copy to the other printables?')}
        description={t(
          'printables.copyBody',
          'This colour, font, terms and toggles will replace the other three document types.',
        )}
        confirmLabel={t('printables.copyOthers', 'Copy to other types')}
        onClose={() => setConfirm(null)}
        onConfirm={() => copy.mutate()}
      />
    </div>
  )
}

export default Printables
