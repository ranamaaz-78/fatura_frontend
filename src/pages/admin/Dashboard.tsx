import { useQuery } from '@tanstack/react-query'
import { Building2, CreditCard, Inbox, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { SkeletonCard, SkeletonStatGrid } from '../../components/ui/Skeleton'
import { StatCard } from '../../components/ui/StatCard'
import { t } from '../../i18n'
import { formatCurrency, formatDate } from '../../lib/format'
import { getErrorMessage } from '../../services/api'
import { getAdminDashboard } from '../../services/admin/dashboard'

function AdminDashboard() {
  const query = useQuery({ queryKey: ['admin', 'dashboard'], queryFn: getAdminDashboard })

  if (query.isPending) {
    return (
      <>
        <PageHeader title={t('nav.dashboard', 'Dashboard')} subtitle={t('admin.dashboardSubtitle', 'Applications, companies and revenue at a glance.')} />
        <SkeletonStatGrid />
        <SkeletonCard />
      </>
    )
  }

  if (query.isError) {
    return (
      <>
        <PageHeader title={t('nav.dashboard', 'Dashboard')} />
        <Card>
          <EmptyState
            icon={Inbox}
            title={t('common.error', 'Something went wrong')}
            description={getErrorMessage(query.error)}
            primaryAction={<Button onClick={() => query.refetch()}>{t('common.retry', 'Retry')}</Button>}
          />
        </Card>
      </>
    )
  }

  const data = query.data

  return (
    <>
      <PageHeader
        title={t('nav.dashboard', 'Dashboard')}
        subtitle={t('admin.dashboardSubtitle', 'Applications, companies and revenue at a glance.')}
        actions={
          <Link to="/admin/applications">
            <Button icon={<Inbox className="h-4 w-4" />}>{t('admin.viewInbox', 'Open inbox')}</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('admin.newApplications', 'New applications')}
          value={data.applications.new}
          icon={<Inbox className="h-4 w-4" />}
          iconColor="bg-blue-50 text-blue-600"
          subtext={`${data.applications.this_week} ${t('admin.thisWeek', 'this week')}`}
        />
        <StatCard
          title={t('admin.activeCompanies', 'Active companies')}
          value={data.companies.active}
          icon={<Building2 className="h-4 w-4" />}
          iconColor="bg-indigo-50 text-indigo-600"
          subtext={`${data.companies.suspended} suspended`}
        />
        <StatCard
          title={t('admin.activeSubscriptions', 'Active subscriptions')}
          value={data.subscriptions.active}
          icon={<CreditCard className="h-4 w-4" />}
          iconColor="bg-emerald-50 text-emerald-600"
          subtext={`${data.subscriptions.expiring_soon} ${t('admin.expiringSoon', 'expiring within 7 days')}`}
        />
        <StatCard
          title={t('admin.revenueThisMonth', 'Revenue this month')}
          value={formatCurrency(data.revenue.this_month, data.revenue.currency, 'en-US')}
          icon={<Wallet className="h-4 w-4" />}
          iconColor="bg-amber-50 text-amber-600"
          subtext={`${formatCurrency(data.revenue.all_time, data.revenue.currency, 'en-US')} all time`}
        />
      </div>

      <Card
        title={t('admin.latestApplications', 'Latest applications')}
        actions={
          <Link to="/admin/applications" className="text-xs font-semibold text-indigo-700">
            {t('admin.viewInbox', 'Open inbox')}
          </Link>
        }
      >
        {data.latest_applications.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={t('common.empty', 'Nothing here yet')}
            description="Applications from the public site will appear here."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.latest_applications.map((application) => (
              <li key={application.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{application.company_name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {application.contact_name} · {application.email}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="hidden font-mono text-[11px] text-slate-400 sm:inline">
                    {formatDate(application.created_at)}
                  </span>
                  <Badge status={application.status.toUpperCase()} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}

export default AdminDashboard
