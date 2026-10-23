import { useQuery } from '@tanstack/react-query'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  FileArchive,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Package,
  PackageCheck,
  PackageMinus,
  PackageX,
  Receipt,
  Truck,
  type LucideIcon,
} from 'lucide-react'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { docPermission, usePermissions } from '../../auth/permissions'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { BulkCancelled, downloadDocumentsPdf, downloadDocumentsZip, type BulkProgress } from '../../lib/bulkDocumentPdf'
import { cn } from '../../lib/cn'
import { downloadFileName, fileDate } from '../../lib/fileName'
import { formatDate } from '../../lib/format'
import { formatCents } from '../../lib/money'
import { downloadStockSheet, stockSheetRows, type StockBand } from '../../lib/stockSheet'
import { monthRange, weeksOfMonth } from '../../lib/weeks'
import { getErrorMessage } from '../../services/api'
import { getReport, listReportDocuments, type ReportDocumentParams } from '../../services/reports'

type DocType = ReportDocumentParams['type']
type Tab = 'documents' | 'stock'

const DOC_TYPES: { type: DocType; icon: LucideIcon; label: () => string }[] = [
  { type: 'factura', icon: Receipt, label: () => t('reportDownloads.invoices', 'Invoices') },
  { type: 'proforma', icon: FileCheck2, label: () => t('reportDownloads.proformas', 'Proformas') },
  { type: 'albaran', icon: Truck, label: () => t('reportDownloads.deliveryNotes', 'Delivery notes') },
]

const card = 'rounded-2xl border border-line/80 bg-card shadow-xs'

const dateInputClass =
  'h-9 rounded-[10px] border border-line bg-card px-2.5 text-[12px] text-slate-700 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20'

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function shiftMonth(month: string, by: number): string {
  const [year, number] = month.split('-').map(Number)
  const moved = new Date(year, number - 1 + by, 1)
  return `${moved.getFullYear()}-${String(moved.getMonth() + 1).padStart(2, '0')}`
}

function monthTitle(month: string): string {
  const [year, number] = month.split('-').map(Number)
  const name = new Intl.DateTimeFormat(t('reportDownloads.locale', 'en-GB'), { month: 'long' }).format(new Date(year, number - 1, 1))
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`
}

function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="flex items-center gap-2.5 text-xs font-bold tracking-[0.04em] text-slate-700 uppercase">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-brand-on">
          {number}
        </span>
        {title}
      </h3>
      {children}
    </div>
  )
}

function Choice({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'cursor-pointer rounded-xl border text-left transition-colors',
        active
          ? 'border-brand-600 bg-brand-600/5 text-slate-900 ring-1 ring-brand-600/30'
          : 'border-line bg-card text-slate-600 hover:border-slate-300 hover:bg-page',
        className,
      )}
    >
      {children}
    </button>
  )
}

function IconTile({ icon: Icon, active }: { icon: LucideIcon; active: boolean }) {
  return (
    <span
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
        active ? 'bg-brand-600 text-brand-on' : 'bg-slate-100 text-slate-500',
      )}
    >
      <Icon className="h-4 w-4" />
    </span>
  )
}

function DocumentsTab({ types }: { types: DocType[] }) {
  const { session } = useAuth()
  const { push } = useToast()
  const currency = session?.company?.currency ?? 'EUR'
  const company = session?.company ?? null

  const [pickedType, setType] = useState<DocType>('factura')
  const type = types.includes(pickedType) ? pickedType : types[0]

  const [month, setMonth] = useState(currentMonth)
  // 0 = the whole month, 1.. = that week, -1 = custom dates
  const [week, setWeek] = useState(0)
  const [customFrom, setCustomFrom] = useState(() => monthRange(currentMonth()).from)
  const [customTo, setCustomTo] = useState(() => monthRange(currentMonth()).to)
  const [includeVoided, setIncludeVoided] = useState(false)

  const weeks = useMemo(() => weeksOfMonth(month), [month])
  const range = useMemo(() => {
    if (week === -1) return { from: customFrom, to: customTo }
    const picked = weeks.find((row) => row.index === week)
    return picked ? { from: picked.from, to: picked.to } : monthRange(month)
  }, [week, weeks, month, customFrom, customTo])
  const rangeReady = range.from !== '' && range.to !== '' && range.from <= range.to

  const documents = useQuery({
    queryKey: ['app', 'reports', 'documents', { type, ...range, includeVoided }],
    queryFn: () => listReportDocuments({ type, ...range, include_voided: includeVoided }),
    enabled: rangeReady,
  })

  const [busy, setBusy] = useState<'zip' | 'pdf' | null>(null)
  const [progress, setProgress] = useState<BulkProgress | null>(null)
  const abort = useRef<AbortController | null>(null)

  const list = documents.data
  const count = list?.items.length ?? 0

  async function run(kind: 'zip' | 'pdf') {
    if (!list || count === 0) return
    const controller = new AbortController()
    abort.current = controller
    setBusy(kind)
    setProgress({ done: 0, total: count })

    const options = {
      ids: list.items.map((item) => item.id),
      company,
      currency,
      // Company - Invoices - 2026-10-01 to 2026-10-31
      fileName: downloadFileName(
        [company?.name, DOC_TYPES.find((option) => option.type === type)?.label(), `${range.from} ${t('reportDownloads.to', 'to')} ${range.to}`],
        '',
      ),
      onProgress: setProgress,
      signal: controller.signal,
    }

    try {
      if (kind === 'zip') await downloadDocumentsZip(options)
      else await downloadDocumentsPdf(options)
      push({ tone: 'success', title: t('reportDownloads.done', 'Download ready.') })
    } catch (error) {
      if (!(error instanceof BulkCancelled)) push({ tone: 'danger', title: getErrorMessage(error) })
    } finally {
      abort.current = null
      setBusy(null)
      setProgress(null)
    }
  }

  const periodLabel = week === 0 ? monthTitle(month) : `${formatDate(range.from)} – ${formatDate(range.to)}`

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      <div className={cn(card, 'flex flex-col gap-7 p-6 lg:col-span-7')}>
        <Step number={1} title={t('reportDownloads.stepType', 'Choose the documents')}>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {DOC_TYPES.filter((option) => types.includes(option.type)).map((option) => (
              <Choice
                key={option.type}
                active={type === option.type}
                onClick={() => setType(option.type)}
                className="flex items-center gap-3 px-4 py-3.5"
              >
                <IconTile icon={option.icon} active={type === option.type} />
                <span className="text-[13px] font-semibold">{option.label()}</span>
              </Choice>
            ))}
          </div>
        </Step>

        <Step number={2} title={t('reportDownloads.stepPeriod', 'Choose the period')}>
          <div className="flex items-center justify-between gap-2 rounded-xl bg-page px-2 py-1.5">
            <button
              type="button"
              aria-label={t('reportDownloads.previousMonth', 'Previous month')}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-600 hover:bg-card"
              onClick={() => {
                setMonth(shiftMonth(month, -1))
                setWeek(0)
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <label className="relative flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-900">
              <CalendarDays className="h-4 w-4 text-brand-600" />
              {monthTitle(month)}
              <input
                type="month"
                aria-label={t('reportDownloads.month', 'Month')}
                value={month}
                onChange={(event) => {
                  if (!event.target.value) return
                  setMonth(event.target.value)
                  setWeek(0)
                }}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
            <button
              type="button"
              aria-label={t('reportDownloads.nextMonth', 'Next month')}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-600 hover:bg-card"
              onClick={() => {
                setMonth(shiftMonth(month, 1))
                setWeek(0)
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label={t('reportDownloads.weeks', 'Weeks')}>
            <Choice active={week === 0} onClick={() => setWeek(0)} className="px-3.5 py-2.5">
              <span className="block text-xs font-semibold">{t('reportDownloads.wholeMonth', 'Whole month')}</span>
              <span className="block text-[11px] text-slate-400">
                {weeks[0]?.from.slice(8)}–{weeks[weeks.length - 1]?.to.slice(8)}
              </span>
            </Choice>
            {weeks.map((row) => (
              <Choice key={row.index} active={week === row.index} onClick={() => setWeek(row.index)} className="px-3.5 py-2.5">
                <span className="block text-xs font-semibold">
                  {t('reportDownloads.week', 'Week :n').replace(':n', String(row.index))}
                </span>
                <span className="block text-[11px] text-slate-400">
                  {row.from.slice(8)}–{row.to.slice(8)}
                </span>
              </Choice>
            ))}
            <Choice active={week === -1} onClick={() => setWeek(-1)} className="px-3.5 py-2.5">
              <span className="block text-xs font-semibold">{t('payments.custom', 'Custom')}</span>
              <span className="block text-[11px] text-slate-400">{t('reportDownloads.anyDates', 'Any dates')}</span>
            </Choice>
          </div>

          {week === -1 ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                aria-label={t('payments.from', 'From')}
                value={customFrom}
                max={customTo}
                onChange={(event) => setCustomFrom(event.target.value)}
                className={dateInputClass}
              />
              <span className="text-[11px] text-slate-400">–</span>
              <input
                type="date"
                aria-label={t('payments.to', 'To')}
                value={customTo}
                min={customFrom}
                onChange={(event) => setCustomTo(event.target.value)}
                className={dateInputClass}
              />
            </div>
          ) : null}

          <label className="flex w-fit cursor-pointer items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={includeVoided} onChange={(event) => setIncludeVoided(event.target.checked)} />
            {t('reportDownloads.includeVoided', 'Include voided documents')}
          </label>
        </Step>
      </div>

      <aside className={cn(card, 'flex flex-col gap-5 p-6 lg:col-span-5 lg:self-start')} aria-live="polite">
        <h3 className="text-xs font-bold tracking-[0.06em] text-slate-900 uppercase">{t('reportDownloads.summary', 'Summary')}</h3>

        <div className="rounded-xl bg-page px-5 py-4">
          <span className="block text-[11px] font-semibold text-slate-500">
            {DOC_TYPES.find((option) => option.type === type)?.label()} · {periodLabel}
          </span>
          {!rangeReady ? (
            <span className="mt-2 block text-sm text-slate-500">{t('reportDownloads.pickDates', 'Pick the dates first.')}</span>
          ) : documents.isLoading ? (
            <span className="mt-2 block text-sm text-slate-500">{t('common.loading', 'Loading…')}</span>
          ) : documents.isError ? (
            <span className="mt-2 block text-sm text-rose-600">{getErrorMessage(documents.error)}</span>
          ) : (
            <>
              <span className="mt-1 block text-3xl font-bold tracking-[-0.02em] text-slate-900">{list?.total ?? 0}</span>
              <span className="block text-xs text-slate-500">
                {list?.total === 1 ? t('reportDownloads.documentOne', 'document') : t('reportDownloads.documentMany', 'documents')}
                {list && list.total > 0 ? ` · ${formatCents(list.sum_cents, currency)}` : ''}
              </span>
              {list?.truncated ? (
                <span className="mt-2 block text-[11px] text-amber-700">
                  {t('reportDownloads.truncated', 'Only the first :n are included. Pick a shorter period.').replace(':n', String(count))}
                </span>
              ) : null}
            </>
          )}
        </div>

        <div className="flex flex-col gap-2.5">
          <Button
            fullWidth
            size="lg"
            icon={<FileArchive className="h-4 w-4" />}
            disabled={busy !== null || count === 0}
            loading={busy === 'zip'}
            onClick={() => void run('zip')}
          >
            {t('reportDownloads.zip', 'ZIP (one PDF each)')}
          </Button>
          <Button
            fullWidth
            size="lg"
            variant="secondary"
            icon={<FileText className="h-4 w-4" />}
            disabled={busy !== null || count === 0}
            loading={busy === 'pdf'}
            onClick={() => void run('pdf')}
          >
            {t('reportDownloads.singlePdf', 'Single PDF (all in one)')}
          </Button>
        </div>

        {busy && progress ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>
                {progress.done} / {progress.total}
              </span>
              <button
                type="button"
                className="cursor-pointer font-semibold text-rose-600 hover:underline"
                onClick={() => abort.current?.abort()}
              >
                {t('common.cancel', 'Cancel')}
              </button>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-brand-600 transition-all"
                style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="text-[11px] leading-relaxed text-slate-400">
            {t('reportDownloads.pdfHint', 'ZIP keeps one PDF per document. Single PDF puts every document on its own page.')}
          </p>
        )}
      </aside>
    </div>
  )
}

const BAND_CHOICES: { key: string; bands: StockBand[]; icon: LucideIcon; label: () => string; hint: () => string }[] = [
  {
    key: 'need',
    bands: ['out', 'low'],
    icon: PackageMinus,
    label: () => t('reportDownloads.bothBands', 'Out of stock and low'),
    hint: () => t('reportDownloads.bothHint', 'What you need to buy'),
  },
  {
    key: 'out',
    bands: ['out'],
    icon: PackageX,
    label: () => t('reportDownloads.outBand', 'Out of stock'),
    hint: () => t('reportDownloads.outHint', 'Nothing left'),
  },
  {
    key: 'low',
    bands: ['low'],
    icon: PackageMinus,
    label: () => t('reportDownloads.lowBand', 'Low stock'),
    hint: () => t('reportDownloads.lowHint', 'At or under the minimum'),
  },
  {
    key: 'ok',
    bands: ['ok'],
    icon: PackageCheck,
    label: () => t('reportDownloads.okBand', 'Remaining stock'),
    hint: () => t('reportDownloads.okHint', 'Enough in stock'),
  },
  {
    key: 'all',
    bands: ['out', 'low', 'ok'],
    icon: Package,
    label: () => t('reportDownloads.allBands', 'All stock'),
    hint: () => t('reportDownloads.allHint', 'Every product'),
  },
]

function StockTab() {
  const { session } = useAuth()
  const company = session?.company ?? null
  const [choice, setChoice] = useState('need')
  const stock = useQuery({ queryKey: ['app', 'reports', 'stock'], queryFn: () => getReport('stock') })
  const rows = stock.data?.rows ?? []
  const picked = BAND_CHOICES.find((option) => option.key === choice) ?? BAND_CHOICES[0]
  const countFor = (bands: StockBand[]) => stockSheetRows(rows, bands).length
  const count = countFor(picked.bands)

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      <div className={cn(card, 'flex flex-col gap-7 p-6 lg:col-span-7')}>
        <Step number={1} title={t('reportDownloads.stepStock', 'Choose the stock level')}>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {BAND_CHOICES.map((option) => {
              const active = option.key === picked.key
              return (
                <Choice
                  key={option.key}
                  active={active}
                  onClick={() => setChoice(option.key)}
                  className={cn('flex items-center gap-3 px-4 py-3.5', option.key === 'all' && 'sm:col-span-2')}
                >
                  <IconTile icon={option.icon} active={active} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold">{option.label()}</span>
                    <span className="block truncate text-[11px] text-slate-400">{option.hint()}</span>
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 tabular-nums">
                    {stock.isLoading ? '…' : countFor(option.bands)}
                  </span>
                </Choice>
              )
            })}
          </div>
        </Step>
      </div>

      <aside className={cn(card, 'flex flex-col gap-5 p-6 lg:col-span-5 lg:self-start')} aria-live="polite">
        <h3 className="text-xs font-bold tracking-[0.06em] text-slate-900 uppercase">{t('reportDownloads.summary', 'Summary')}</h3>

        <div className="rounded-xl bg-page px-5 py-4">
          <span className="block text-[11px] font-semibold text-slate-500">{picked.label()}</span>
          {stock.isLoading ? (
            <span className="mt-2 block text-sm text-slate-500">{t('common.loading', 'Loading…')}</span>
          ) : stock.isError ? (
            <span className="mt-2 block text-sm text-rose-600">{getErrorMessage(stock.error)}</span>
          ) : (
            <>
              <span className="mt-1 block text-3xl font-bold tracking-[-0.02em] text-slate-900">{count}</span>
              <span className="block text-xs text-slate-500">
                {count === 1 ? t('reportDownloads.productOne', 'product') : t('reportDownloads.productMany', 'products')}
              </span>
            </>
          )}
        </div>

        <Button
          fullWidth
          size="lg"
          icon={<FileSpreadsheet className="h-4 w-4" />}
          disabled={stock.isLoading || count === 0}
          onClick={() =>
            downloadStockSheet(
              rows,
              picked.bands,
              t('reportDownloads.stockSheet', 'Stock'),
              // Company - Stock Out of stock and low - 2026-10-19
              downloadFileName([company?.name, `${t('reportDownloads.stockSheet', 'Stock')} ${picked.label()}`, fileDate()], 'xlsx'),
            )
          }
        >
          {t('reportDownloads.downloadSheet', 'Download sheet')}
        </Button>
        {!stock.isLoading && count === 0 ? (
          <p className="text-[11px] text-slate-400">{t('reportDownloads.noStock', 'No products to list.')}</p>
        ) : (
          <p className="text-[11px] leading-relaxed text-slate-400">
            {t('reportDownloads.stockHint', 'Your products by stock level (out, low, remaining or all), in the same columns as the product import sheet.')}
          </p>
        )}
      </aside>
    </div>
  )
}

function ReportDownloads() {
  const { can } = usePermissions()
  const [params, setParams] = useSearchParams()

  const types = DOC_TYPES.map((option) => option.type).filter((type) => can(docPermission(type, 'view')))
  const tabs: { key: Tab; label: string; icon: LucideIcon }[] = [
    ...(types.length > 0
      ? [{ key: 'documents' as const, label: t('reportDownloads.documents', 'Documents (PDF)'), icon: FileText }]
      : []),
    { key: 'stock', label: t('reportDownloads.stock', 'Stock to buy (Excel)'), icon: FileSpreadsheet },
  ]
  const requested = params.get('tab')
  const tab = tabs.find((option) => option.key === requested)?.key ?? tabs[0].key

  return (
    <div className="flex flex-col gap-5">
      <div className={cn(card, 'flex items-center gap-4 p-6')}>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-brand-on">
          <Download className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold tracking-[-0.02em] text-slate-900">{t('reportDownloads.title', 'Downloads')}</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {t('reportDownloads.subtitle', 'Documents of a month or a week as PDF, and the stock to buy as an Excel sheet.')}
          </p>
        </div>
      </div>

      <div role="tablist" className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-2xl border border-line/80 bg-card p-1.5 shadow-xs">
        {tabs.map((option) => {
          const Icon = option.icon
          const active = tab === option.key
          return (
            <button
              key={option.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setParams(option.key === tabs[0].key ? {} : { tab: option.key }, { replace: true })}
              className={cn(
                'inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-colors',
                active ? 'bg-brand-600 text-brand-on shadow-xs' : 'text-slate-600 hover:bg-slate-100',
              )}
            >
              <Icon className="h-4 w-4" />
              {option.label}
            </button>
          )
        })}
      </div>

      {tab === 'documents' ? <DocumentsTab types={types} /> : <StockTab />}
    </div>
  )
}

export default ReportDownloads
