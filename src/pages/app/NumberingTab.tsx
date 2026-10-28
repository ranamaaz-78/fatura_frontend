import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileCheck2, FileText, Info, Receipt, Truck, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { onlyDigits } from '../../lib/numberInput'
import { getErrorMessage, mapValidationErrors } from '../../services/api'
import { getDocumentSeries, saveDocumentSeries, type DocumentSeries, type DocumentSeriesInput } from '../../services/documentSeries'
import type { IssuableType } from '../../types/sales'
import { typeLabel } from './documentTypes'

const ICON: Record<IssuableType, LucideIcon> = {
  factura: Receipt,
  albaran: Truck,
  quotation: FileText,
  proforma: FileCheck2,
}

type Draft = Record<IssuableType, { prefix: string; start: string; first: string }>

function toDraft(series: DocumentSeries[]): Draft {
  const draft = {} as Draft
  for (const row of series) draft[row.kind] = { prefix: row.prefix, start: String(row.start), first: String(row.first) }
  return draft
}

/** A number as the server writes it: letters, the month, five digits. `monthsAhead` 1 is next month. */
function written(prefix: string, number: number, monthsAhead = 0): string {
  const now = new Date()
  const month = new Date(now.getFullYear(), now.getMonth() + monthsAhead, 1)
  const period = `${month.getFullYear()}${String(month.getMonth() + 1).padStart(2, '0')}`
  return `${(prefix.trim() || '…').toUpperCase()}-${period}/${String(Math.max(1, number)).padStart(5, '0')}`
}

/**
 * Settings → Numbering: the letters each document starts with and the number each month begins from. It only shapes
 * the numbers still to come. The series never goes back, so a number that was used is never used again.
 */
export function NumberingTab() {
  const { push } = useToast()
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['app', 'document-series'], queryFn: getDocumentSeries })
  const [draft, setDraft] = useState<Draft | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (query.data) setDraft(toDraft(query.data.series))
  }, [query.data])

  const save = useMutation({
    mutationFn: (value: Draft) => {
      const body = {} as DocumentSeriesInput
      for (const kind of Object.keys(value) as IssuableType[]) {
        body[kind] = { prefix: value[kind].prefix.trim(), start: Number(value[kind].start) || 0, first: Number(value[kind].first) || 0 }
      }
      return saveDocumentSeries(body)
    },
    onSuccess: (data) => {
      setErrors({})
      queryClient.setQueryData(['app', 'document-series'], data)
      // The new-sale screen shows the next number, so it asks again.
      void queryClient.invalidateQueries({ queryKey: ['app', 'sales', 'preview'] })
      push({ tone: 'success', title: t('numbering.saved', 'Numbering saved.') })
    },
    onError: (error) => {
      const mapped = mapValidationErrors(error)
      setErrors(mapped)
      push({ tone: 'danger', title: Object.keys(mapped).length > 0 ? t('numbering.fixErrors', 'Check the highlighted fields.') : getErrorMessage(error) })
    },
  })

  if (query.isPending || !draft) {
    return (
      <div className="space-y-3 p-5">
        <span className="block h-5 w-40 animate-pulse rounded-xl bg-slate-100" />
        <span className="block h-24 w-full animate-pulse rounded-2xl bg-slate-100" />
        <span className="block h-24 w-full animate-pulse rounded-2xl bg-slate-100" />
      </div>
    )
  }

  const rows = query.data?.series ?? []
  const changed = rows.some((row) => draft[row.kind]?.prefix.trim().toUpperCase() !== row.prefix || Number(draft[row.kind]?.start) !== row.start || Number(draft[row.kind]?.first) !== row.first)

  function edit(kind: IssuableType, patch: Partial<Draft[IssuableType]>) {
    setDraft((current) => (current ? { ...current, [kind]: { ...current[kind], ...patch } } : current))
  }

  return (
    <div className="flex flex-col gap-5 p-5">
      <div>
        <h2 className="text-base font-bold text-ink">{t('numbering.title', 'Document numbering')}</h2>
        <p className="mt-1 text-xs text-ink-muted">
          {t('numbering.intro', 'Choose the letters each document starts with and the number it begins from. This only changes the numbers still to come: documents already issued keep theirs.')}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {rows.map((row) => {
          const Icon = ICON[row.kind]
          const value = draft[row.kind]
          if (!value) return null

          return (
            <div key={row.kind} className="rounded-2xl border border-line bg-card p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink">{typeLabel(row.kind)}</p>
                  <p className="text-[11px] text-ink-muted">
                    {row.issued_this_month > 0
                      ? t('numbering.issuedThisMonth', '{count} issued this month', { count: row.issued_this_month })
                      : t('numbering.noneThisMonth', 'None issued this month yet')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-ink-muted">{t('numbering.nextNumber', 'Next number')}</p>
                  <p className="text-sm font-extrabold tracking-tight text-brand-600">
                    {written(value.prefix, Math.max(row.issued_this_month + 1, Number(value.first) || 1))}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-muted">
                    {t('numbering.nextMonthIs', 'Next month starts at {number}', { number: written(value.prefix, Number(value.start) || 1, 1) })}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Input
                  compact
                  label={t('numbering.letters', 'Letters in front')}
                  hint={t('numbering.lettersHint', '1 to 10 letters or numbers. Standard: {letters}', { letters: row.default_prefix })}
                  maxLength={10}
                  autoComplete="off"
                  value={value.prefix}
                  error={errors[`series.${row.kind}.prefix`]}
                  onChange={(event) => edit(row.kind, { prefix: event.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase() })}
                />
                <Input
                  compact
                  inputMode="numeric"
                  label={t('numbering.first', 'First number, this month')}
                  hint={t('numbering.firstHint', 'Where this month begins, for example 123. Only this month.')}
                  maxLength={7}
                  value={value.first}
                  error={errors[`series.${row.kind}.first`]}
                  onChange={(event) => edit(row.kind, { first: onlyDigits(event.target.value) })}
                />
                <Input
                  compact
                  inputMode="numeric"
                  label={t('numbering.start', 'Every next month starts from')}
                  hint={t('numbering.startHint', 'Where each new month begins. Standard: 1')}
                  maxLength={7}
                  value={value.start}
                  error={errors[`series.${row.kind}.start`]}
                  onChange={(event) => edit(row.kind, { start: onlyDigits(event.target.value) })}
                />
              </div>
            </div>
          )
        })}
      </div>

      <p className="flex items-start gap-2 rounded-xl bg-brand-50 px-3.5 py-3 text-xs leading-relaxed text-ink">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
        {t(
          'numbering.rules',
          'Numbers have the month in them (ACME-202610/00123). The first number is only for this month; every month after it begins at the start number you set (usually 1). The series never goes back: a number that was already used is not used twice. Each document needs letters of its own.',
        )}
      </p>

      <div className="flex justify-end">
        <Button loading={save.isPending} disabled={!changed} onClick={() => save.mutate(draft)}>
          {t('numbering.save', 'Save numbering')}
        </Button>
      </div>
    </div>
  )
}
