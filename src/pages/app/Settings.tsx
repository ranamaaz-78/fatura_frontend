import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Settings, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Tooltip } from '../../components/ui/Tooltip'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { getErrorMessage } from '../../services/api'
import { createTaxRate, deleteTaxRate, listTaxRates } from '../../services/catalog'
import type { TaxRate } from '../../types/catalog'

function Page() {
  const queryClient = useQueryClient()
  const { push } = useToast()
  const rates = useQuery({ queryKey: ['app', 'tax-rates'], queryFn: listTaxRates })
  const [name, setName] = useState('')
  const [rate, setRate] = useState('')
  const [removing, setRemoving] = useState<TaxRate | null>(null)

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['app', 'tax-rates'] })
  }

  const add = useMutation({
    mutationFn: () => createTaxRate({ name: name.trim(), rate: Number(rate) }),
    onSuccess: () => {
      setName('')
      setRate('')
      void refresh()
      push({ tone: 'success', title: t('settings.rateAdded', 'IVA rate added.') })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const remove = useMutation({
    mutationFn: (item: TaxRate) => deleteTaxRate(item.id),
    onSuccess: () => {
      setRemoving(null)
      void refresh()
      push({ tone: 'success', title: t('settings.rateRemoved', 'IVA rate removed.') })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const canAdd = name.trim() !== '' && rate.trim() !== '' && !Number.isNaN(Number(rate))

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eff4ff] text-[#004ac6]">
          <Settings className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold tracking-[-0.02em] text-slate-900">{t('nav.settings', 'Settings')}</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {t('settings.ivaHint', 'These IVA rates appear on products and on the invoice.')}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-900">{t('settings.ivaRates', 'IVA rates')}</h2>
        </div>

        <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1 text-[11px] font-semibold text-slate-600">
            {t('settings.rateName', 'Name')}
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('settings.rateNamePlaceholder', 'General')}
              className="mt-1 h-[38px] w-full rounded-xl border border-slate-200 px-3 text-[13px] font-medium text-slate-900 outline-none focus:border-[#004ac6] focus:ring-2 focus:ring-[#004ac6]/20"
            />
          </label>
          <label className="w-full text-[11px] font-semibold text-slate-600 sm:w-28">
            {t('settings.ratePercent', 'Percent')}
            <input
              value={rate}
              inputMode="decimal"
              onChange={(event) => setRate(event.target.value)}
              placeholder="21"
              className="mt-1 h-[38px] w-full rounded-xl border border-slate-200 px-3 font-mono text-[13px] font-medium text-slate-900 outline-none focus:border-[#004ac6] focus:ring-2 focus:ring-[#004ac6]/20"
            />
          </label>
          <button
            type="button"
            disabled={!canAdd || add.isPending}
            onClick={() => add.mutate()}
            className="inline-flex h-[38px] cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#004ac6] px-4 text-xs font-semibold text-white hover:bg-[#2563eb] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {t('settings.addRate', 'Add')}
          </button>
        </div>

        {rates.isPending ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_item, index) => (
              <span key={index} className="block h-10 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {(rates.data ?? []).map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                <span className="w-16 font-mono text-sm font-bold text-[#004ac6]">{item.rate}%</span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-slate-800">{item.name}</span>
                <Tooltip content={t('common.delete', 'Delete')} align="end">
                  <button
                    type="button"
                    aria-label={`${t('common.delete', 'Delete')} ${item.rate}%`}
                    onClick={() => setRemoving(item)}
                    className="flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Tooltip>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={() => removing && remove.mutate(removing)}
        loading={remove.isPending}
        title={t('settings.deleteRateTitle', 'Remove this IVA rate?')}
        description={t(
          'settings.deleteRateBody',
          ':name will disappear from the product and invoice lists. Products that already use it keep their rate.',
        ).replace(':name', removing ? `${removing.rate}% (${removing.name})` : '')}
        confirmLabel={t('common.delete', 'Delete')}
      />
    </div>
  )
}

export default Page
