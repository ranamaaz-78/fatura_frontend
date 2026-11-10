import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Info, Receipt } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { getErrorMessage, mapValidationErrors } from '../../services/api'
import { getInvoiceNumbering, saveInvoiceNumbering, type InvoiceNumbering } from '../../services/documentSeries'

const KEY = ['app', 'document-series']
const EXAMPLE = 'ALP-00234'

/** "ALP-00234" → the text in front, the digits and the number; null when it does not end in digits. Same rule as the server. */
function parseTyped(value: string): { prefix: string; width: number; number: number } | null {
  const found = /^([A-Za-z0-9\-/_.]*?)(\d+)$/.exec(value.trim())
  if (!found || value.trim().length > 30 || found[2]!.length > 8 || Number(found[2]) < 1) return null
  return { prefix: found[1]!, width: found[2]!.length, number: Number(found[2]) }
}

const write = (parsed: { prefix: string; width: number }, number: number) => `${parsed.prefix}${String(number).padStart(parsed.width, '0')}`

function Choice({ active, title, example, children, onClick }: { active: boolean; title: string; example: string; children?: React.ReactNode; onClick: () => void }) {
  return (
    <div className={cn('rounded-2xl border bg-card p-4 transition', active ? 'border-brand-600 ring-2 ring-brand-600/15' : 'border-line')}>
      <button type="button" onClick={onClick} className="flex w-full cursor-pointer items-center gap-3 text-left">
        <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2', active ? 'border-brand-600 bg-brand-600 text-brand-on' : 'border-line')}>
          {active ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-ink">{title}</span>
          <span className="block text-[11px] text-ink-muted">{example}</span>
        </span>
      </button>
      {active && children ? <div className="mt-4">{children}</div> : null}
    </div>
  )
}

/**
 * Settings → Numbering: how invoices are numbered. The built-in numbers, or the company's own: type one number
 * ("ALP-00234") and every next invoice continues from it. Only the numbers still to come change.
 */
export function NumberingTab() {
  const { push } = useToast()
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: KEY, queryFn: getInvoiceNumbering })
  const [mode, setMode] = useState<'auto' | 'manual'>('auto')
  const [typed, setTyped] = useState('')
  const [error, setError] = useState<string | undefined>()

  useEffect(() => {
    if (!query.data) return
    setMode(query.data.mode)
    setTyped(query.data.mode === 'manual' ? query.data.next_number : '')
    setError(undefined)
  }, [query.data])

  const save = useMutation({
    mutationFn: () => saveInvoiceNumbering(mode === 'auto' ? { mode: 'auto' } : { mode: 'manual', next_number: typed.trim() }),
    onSuccess: (data: InvoiceNumbering) => {
      setError(undefined)
      queryClient.setQueryData(KEY, data)
      // The new-sale screen shows the next number, so it asks again.
      void queryClient.invalidateQueries({ queryKey: ['app', 'sales', 'preview'] })
      push({ tone: 'success', title: t('numbering.saved', 'Numbering saved.') })
    },
    onError: (failure) => {
      const mapped = mapValidationErrors(failure)
      setError(mapped.next_number)
      push({ tone: 'danger', title: mapped.next_number ? t('numbering.fixErrors', 'Check the highlighted fields.') : getErrorMessage(failure) })
    },
  })

  if (query.isPending || !query.data) {
    return (
      <div className="space-y-3 p-5">
        <span className="block h-5 w-40 animate-pulse rounded-xl bg-slate-100" />
        <span className="block h-20 w-full animate-pulse rounded-2xl bg-slate-100" />
        <span className="block h-20 w-full animate-pulse rounded-2xl bg-slate-100" />
      </div>
    )
  }

  const data = query.data
  const parsed = parseTyped(typed)
  const changed = mode !== data.mode || (mode === 'manual' && typed.trim() !== data.next_number)
  const canSave = changed && (mode === 'auto' || parsed !== null)

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Receipt className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-bold text-ink">{t('numbering.title', 'Invoice numbering')}</h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            {t('numbering.intro', 'Choose how your invoices are numbered. This only changes the numbers still to come: invoices already issued keep theirs.')}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Choice
          active={mode === 'auto'}
          title={t('numbering.auto', 'Automatic')}
          example={t('numbering.autoExample', 'The built-in number, with the month in it and starting again each month: {example}', { example: data.automatic_example })}
          onClick={() => setMode('auto')}
        />
        <Choice
          active={mode === 'manual'}
          title={t('numbering.manual', 'My own numbers')}
          example={t('numbering.manualExample', 'You type a number once, for example ALP-00234, and every next invoice continues from it.')}
          onClick={() => setMode('manual')}
        >
          <Input
            compact
            label={t('numbering.nextInvoice', 'Next invoice number')}
            hint={t('numbering.nextInvoiceHint', 'Letters or symbols, then the digits at the end. The very next invoice gets exactly this number.')}
            placeholder={EXAMPLE}
            maxLength={30}
            autoComplete="off"
            value={typed}
            error={error}
            onChange={(event) => {
              setTyped(event.target.value.replace(/[^A-Za-z0-9\-/_.]/g, ''))
              setError(undefined)
            }}
          />
          {parsed ? (
            <p className="mt-3 text-xs text-ink-muted">
              {t('numbering.preview', 'Your invoices will be:')}{' '}
              <span className="font-bold text-brand-600">
                {write(parsed, parsed.number)}, {write(parsed, parsed.number + 1)}, {write(parsed, parsed.number + 2)}…
              </span>
            </p>
          ) : typed.trim() ? (
            <p className="mt-3 text-xs text-ink-muted">{t('numbering.needDigits', 'Write it like ALP-00234: letters or symbols, then digits at the end.')}</p>
          ) : null}
          {data.mode === 'manual' && data.last_number ? (
            <p className="mt-2 text-xs text-ink-muted">{t('numbering.lastIssued', 'Last invoice issued with your numbers: {number}', { number: data.last_number })}</p>
          ) : null}
        </Choice>
      </div>

      <p className="flex items-start gap-2 rounded-xl bg-brand-50 px-3.5 py-3 text-xs leading-relaxed text-ink">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
        {t(
          'numbering.rules',
          'A number is never used twice: if you type one that is already taken, the next free one is used. Delivery notes, quotations and proformas keep their standard numbers.',
        )}
      </p>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-ink-muted">
          {t('numbering.nextIs', 'The next invoice will be')} <span className="font-bold text-ink">{data.next_number}</span>
        </p>
        <Button loading={save.isPending} disabled={!canSave} onClick={() => save.mutate()}>
          {t('numbering.save', 'Save numbering')}
        </Button>
      </div>
    </div>
  )
}
