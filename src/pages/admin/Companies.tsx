import { useQuery } from '@tanstack/react-query'
import { Building2, Eye } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable'
import { EmptyState } from '../../components/ui/EmptyState'
import { IconButton } from '../../components/ui/IconButton'
import { PageHeader } from '../../components/ui/PageHeader'
import { Tabs } from '../../components/ui/Tabs'
import { t } from '../../i18n'
import { formatDate } from '../../lib/format'
import { listCompanies } from '../../services/admin/companies'
import type { Company, CompanyStatus } from '../../types/module01'

type TabId = CompanyStatus | 'all'

function AdminCompanies() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<TabId>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const query = useQuery({
    queryKey: ['admin', 'companies', tab, search, page],
    queryFn: () => listCompanies({ status: tab, search, page }),
  })

  const rows = query.data?.items ?? []
  const meta = query.data?.meta

  const columns: DataTableColumn<Company>[] = [
    {
      key: 'name',
      header: 'Company',
      cell: (row) => (
        <Link to={`/admin/companies/${row.id}`} className="font-semibold text-slate-900 hover:text-indigo-700">
          {row.name}
        </Link>
      ),
    },
    {
      key: 'owner',
      header: t('admin.owner', 'Owner'),
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm">{row.owner?.name ?? '—'}</p>
          <p className="truncate font-mono text-xs text-slate-500">{row.owner?.email ?? ''}</p>
        </div>
      ),
    },
    {
      key: 'subscription',
      header: t('admin.subscription', 'Subscription'),
      cell: (row) =>
        row.active_subscription ? (
          <div>
            <p className="text-sm">{row.active_subscription.plan_name}</p>
            <p className="font-mono text-xs text-slate-500">
              {row.active_subscription.days_left} {t('admin.daysLeft', 'days left')}
            </p>
          </div>
        ) : (
          <span className="text-xs text-slate-400">{t('admin.noSubscription', 'No subscription yet.')}</span>
        ),
    },
    { key: 'created', header: 'Created', cell: (row) => formatDate(row.created_at) },
    { key: 'status', header: 'Status', cell: (row) => <Badge status={row.status.toUpperCase()} /> },
  ]

  return (
    <>
      <PageHeader
        title={t('nav.companies', 'Companies')}
        subtitle={t('admin.companiesSubtitle', 'Live accounts, their owners and subscription state.')}
      />

      <Tabs
        value={tab}
        onChange={(id) => {
          setTab(id as TabId)
          setPage(1)
        }}
        items={[
          { id: 'all', label: t('common.all', 'All') },
          { id: 'active', label: t('status.ACTIVE', 'Active') },
          { id: 'suspended', label: t('status.SUSPENDED', 'Suspended') },
        ]}
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => String(row.id)}
        loading={query.isPending}
        search={search}
        onSearch={(value) => {
          setSearch(value)
          setPage(1)
        }}
        page={meta?.current_page}
        pageCount={meta?.last_page}
        onPageChange={setPage}
        summary={meta ? `${meta.total} total` : undefined}
        empty={
          <EmptyState
            icon={Building2}
            title={t('common.empty', 'Nothing here yet')}
            description="Companies appear here once you convert an application."
          />
        }
        rowActions={(row) => (
          <IconButton
            label={t('admin.viewCompany', 'View company')}
            tooltipAlign="end"
            onClick={() => navigate(`/admin/companies/${row.id}`)}
          >
            <Eye className="h-4 w-4" />
          </IconButton>
        )}
      />
    </>
  )
}

export default AdminCompanies
