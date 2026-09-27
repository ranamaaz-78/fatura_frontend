import { useQuery } from '@tanstack/react-query'
import { Receipt } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { EmptyState } from '../../components/ui/EmptyState'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { formatCents } from '../../lib/money'
import { listSales } from '../../services/sales'
import type { PaymentStatus, SaleType } from '../../types/sales'

const TYPES: Array<SaleType | 'all'> = ['all', 'factura', 'albaran', 'abono']

function paymentClass(status: PaymentStatus): string {
  return status === 'paid'
    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    : 'bg-amber-50 text-amber-700 border border-amber-200'
}

function Invoices() {
  const { session } = useAuth()
  const currency = session?.company?.currency ?? 'USD'
  const [type, setType] = useState<SaleType | 'all'>('all')
  const [payment, setPayment] = useState<PaymentStatus | 'all'>('all')

  const query = useQuery({
    queryKey: ['app', 'sales', { type, payment }],
    queryFn: () =>
      listSales({
        type: type === 'all' ? undefined : type,
        payment_status: payment === 'all' ? undefined : payment,
      }),
  })

  const rows = query.data ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-[-0.02em] text-slate-900">{t('nav.invoices', 'Invoices')}</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {rows.length} {t('sales.documents', 'documents')}
          </p>
        </div>
        <Link
          to="/app/invoices/new"
          className="inline-flex h-10 items-center rounded-xl bg-[#004ac6] px-4 text-xs font-semibold text-white"
        >
          {t('sales.newTitle', 'New sale')}
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {TYPES.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setType(option)}
            className={cn(
              'cursor-pointer rounded-full px-3 py-1 text-xs font-semibold',
              type === option ? 'bg-[#004ac6] text-white' : 'bg-white text-slate-600 border border-slate-200',
            )}
          >
            {option === 'all' ? t('common.all', 'All') : option}
          </button>
        ))}
        {(['all', 'pending', 'paid'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setPayment(option)}
            className={cn(
              'cursor-pointer rounded-full px-3 py-1 text-xs font-semibold',
              payment === option ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200',
            )}
          >
            {option === 'all'
              ? t('sales.anyPayment', 'Any payment')
              : option === 'paid'
                ? t('sales.paid', 'Paid')
                : t('sales.pending', 'Pending')}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {query.isPending ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_item, index) => (
              <span key={index} className="block h-12 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={t('sales.emptyTitle', 'No documents yet')}
            description={t('sales.emptyBody', 'Issue a factura, albarán or abono from New sale.')}
          />
        ) : (
          rows.map((document) => (
            <Link
              key={document.id}
              to={`/app/invoices/${document.id}`}
              className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0 hover:bg-slate-50"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-mono text-sm font-bold text-slate-900">{document.number}</span>
                <span className="block truncate text-xs text-slate-500">
                  {document.client_name}
                  {document.client_company ? ` · ${document.client_company}` : ''}
                </span>
              </span>
              <span className="hidden font-mono text-[11px] text-slate-400 sm:block">
                {new Date(document.issued_at).toLocaleString()}
              </span>
              <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold', paymentClass(document.payment_status))}>
                {document.payment_status === 'paid' ? t('sales.paid', 'Paid') : t('sales.pending', 'Pending')}
              </span>
              <span className="w-24 text-right font-mono text-sm font-bold text-slate-900">
                {formatCents(document.total_cents, currency)}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}

export default Invoices
