import { useQuery } from '@tanstack/react-query'
import { Receipt } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { SkeletonCard } from '../../components/ui/Skeleton'
import { t } from '../../i18n'
import { getErrorMessage } from '../../services/api'
import { getHealth } from '../../services/health'

function Dashboard() {
  const navigate = useNavigate()
  const health = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.dashboard', 'Dashboard')}
        subtitle={t('dashboard.subtitle', 'Workspace overview. Modules will land here one at a time.')}
        actions={
          <Button onClick={() => navigate('/app/invoices/new')}>
            {t('dashboard.newInvoice', 'New invoice')}
          </Button>
        }
      />

      {health.isLoading ? <SkeletonCard /> : null}

      {health.isError ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-sm text-rose-700">
          <p>{t('home.unreachable', 'Backend not reachable')}</p>
          <p className="text-xs mt-1">{getErrorMessage(health.error)}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => health.refetch()}>
            {t('common.retry', 'Retry')}
          </Button>
        </div>
      ) : null}

      {health.data ? (
        <Card title={t('home.connected', 'Backend connected')} subtitle={health.data.app}>
          <p className="text-sm text-slate-700">{t('dashboard.apiOk', 'The API health endpoint responded.')}</p>
          <p className="mt-1 text-xs font-mono text-slate-500">{health.data.time}</p>
        </Card>
      ) : null}

      <Card>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Receipt className="w-4 h-4" />
          {t('dashboard.recentEmpty', 'No documents yet.')}
        </div>
      </Card>
    </div>
  )
}

export default Dashboard
