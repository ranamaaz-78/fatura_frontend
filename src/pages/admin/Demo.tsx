import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Boxes, Contact2, FileText, FlaskConical, Package, RotateCcw, ShoppingBag, Truck, Users } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Toggle } from '../../components/ui/Toggle'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { PageHeader } from '../../components/ui/PageHeader'
import { SkeletonCard } from '../../components/ui/Skeleton'
import { useToast } from '../../components/ui/Toast'
import { intlLocale, t } from '../../i18n'
import { getErrorMessage } from '../../services/api'
import { getAdminDemo, resetDemo, setDemoEnabled } from '../../services/demo'

const KEY = ['admin', 'demo']

function Figure({ label, value, icon }: { label: string; value: ReactNode; icon: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line/80 bg-card p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-[0.06em] text-ink-muted uppercase">{label}</p>
        <p className="text-xl font-bold text-ink">{value}</p>
      </div>
    </div>
  )
}

/** The shared demo account: how much customers use it, what is in it now, and a button to put it back to the sample. */
export default function AdminDemo() {
  const queryClient = useQueryClient()
  const { push } = useToast()
  const query = useQuery({ queryKey: KEY, queryFn: getAdminDemo })
  const [confirming, setConfirming] = useState(false)

  const reset = useMutation({
    mutationFn: resetDemo,
    onSuccess: (data) => {
      queryClient.setQueryData(KEY, data)
      setConfirming(false)
      push({ tone: 'success', title: t('demoAdmin.done', 'The demo is back to its sample data.') })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const power = useMutation({
    mutationFn: setDemoEnabled,
    onSuccess: (data) => {
      queryClient.setQueryData(KEY, data)
      push({ tone: 'success', title: data.enabled ? t('demoAdmin.nowOn', 'The demo is on.') : t('demoAdmin.nowOff', 'The demo is off.') })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const data = query.data

  return (
    <>
      <PageHeader
        title={t('demoAdmin.title', 'Demo account')}
        subtitle={t('demoAdmin.subtitle', 'The shared practice account every customer can enter from their dashboard. It is cleared by itself every night at 04:00.')}
        actions={
          <Button icon={<RotateCcw className="h-4 w-4" />} onClick={() => setConfirming(true)}>
            {t('demoAdmin.reset', 'Reset now')}
          </Button>
        }
      />

      {query.isPending || !data ? (
        <SkeletonCard />
      ) : (
        <>
          <Card title={t('demoAdmin.power', 'Demo switch')}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="max-w-xl text-sm text-ink-muted">
                {data.enabled
                  ? t('demoAdmin.onHint', 'The demo is on: customers see "Practice in the demo" on their dashboard.')
                  : t('demoAdmin.offHint', 'The demo is off: the button is hidden for every customer, and anyone inside was sent back to their own account.')}
              </p>
              <Toggle
                checked={data.enabled}
                disabled={power.isPending}
                onChange={(next) => power.mutate(next)}
                label={data.enabled ? t('demoAdmin.on', 'On') : t('demoAdmin.off', 'Off')}
              />
            </div>
          </Card>
          <Card title={t('demoAdmin.usage', 'How it is used')}>
            <div className="grid gap-3 sm:grid-cols-3">
              <Figure label={t('demoAdmin.entriesToday', 'Visits today')} value={data.entries_today} icon={<FlaskConical className="h-5 w-5" />} />
              <Figure label={t('demoAdmin.entriesTotal', 'Visits in total')} value={data.entries_total} icon={<Boxes className="h-5 w-5" />} />
              <Figure label={t('demoAdmin.people', 'Different people')} value={data.people_total} icon={<Users className="h-5 w-5" />} />
            </div>
            <p className="mt-4 text-xs text-ink-muted">
              {data.last_reset
                ? `${t('demoAdmin.lastReset', 'Last reset')}: ${new Date(data.last_reset).toLocaleString(intlLocale())}`
                : t('demoAdmin.neverReset', 'It has not been built yet: it is made the first time someone goes in, or when you press Reset now.')}
            </p>
          </Card>

          <Card title={t('demoAdmin.inside', 'In the demo right now')} subtitle={t('demoAdmin.insideHint', 'What visitors have left behind since the last reset.')}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Figure label={t('nav.products', 'Products')} value={data.data.products} icon={<Package className="h-5 w-5" />} />
              <Figure label={t('nav.customers', 'Clients')} value={data.data.customers} icon={<Contact2 className="h-5 w-5" />} />
              <Figure label={t('nav.suppliers', 'Suppliers')} value={data.data.suppliers} icon={<Truck className="h-5 w-5" />} />
              <Figure label={t('demoAdmin.documents', 'Documents')} value={data.data.documents} icon={<FileText className="h-5 w-5" />} />
              <Figure label={t('nav.purchases', 'Purchases')} value={data.data.purchases} icon={<ShoppingBag className="h-5 w-5" />} />
            </div>
          </Card>
        </>
      )}

      <ConfirmDialog
        open={confirming}
        loading={reset.isPending}
        tone="warning"
        title={t('demoAdmin.confirmTitle', 'Reset the demo now?')}
        description={t('demoAdmin.confirmBody', 'Everything visitors added is deleted and the sample data is written again. People inside the demo stay signed in and see the clean data.')}
        confirmLabel={t('demoAdmin.reset', 'Reset now')}
        onClose={() => setConfirming(false)}
        onConfirm={() => reset.mutate()}
      />
    </>
  )
}
