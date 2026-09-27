import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Printer } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { formatCents } from '../../lib/money'
import { getErrorMessage } from '../../services/api'
import { getSale, updateSalePayment } from '../../services/sales'
import type { PaymentStatus, SaleDocument } from '../../types/sales'

const TYPE_LABEL: Record<SaleDocument['type'], string> = {
  factura: 'Factura',
  albaran: 'Albarán',
  abono: 'Abono',
}

function paymentClass(status: PaymentStatus): string {
  return status === 'paid'
    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    : 'bg-amber-50 text-amber-700 border border-amber-200'
}

function InvoiceDetail() {
  const { id } = useParams()
  const { session } = useAuth()
  const { push } = useToast()
  const queryClient = useQueryClient()
  const currency = session?.company?.currency ?? 'USD'
  const company = session?.company
  const documentId = Number(id)

  const query = useQuery({
    queryKey: ['app', 'sale', documentId],
    queryFn: () => getSale(documentId),
    enabled: Number.isFinite(documentId),
  })

  const payment = useMutation({
    mutationFn: (status: PaymentStatus) => updateSalePayment(documentId, status),
    onSuccess: (document) => {
      queryClient.setQueryData(['app', 'sale', documentId], document)
      void queryClient.invalidateQueries({ queryKey: ['app', 'sales'] })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const document = query.data

  if (query.isPending || !document) {
    return <div className="h-64 animate-pulse rounded-2xl bg-white" />
  }

  const issued = new Date(document.issued_at)
  const due = document.total_cents > 0 && document.payment_status === 'pending' ? document.total_cents : 0
  const groups = new Map<number, { base: number; tax: number }>()
  for (const line of document.lines ?? []) {
    const group = groups.get(line.iva_percent) ?? { base: 0, tax: 0 }
    group.base += line.base_cents
    group.tax += line.tax_cents
    groups.set(line.iva_percent, group)
  }

  const initials = (company?.name ?? 'FA').slice(0, 2).toUpperCase()

  return (
    <div className="flex flex-col gap-6">
      <div className="no-print flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs lg:flex-row lg:items-center">
        <div>
          <Link to="/app/invoices" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('sales.allDocuments', 'All documents')}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-[22px] font-bold tracking-tight text-slate-900">{document.number}</h1>
            <span className={cn('rounded-full px-3 py-0.5 text-xs font-semibold', paymentClass(document.payment_status))}>
              {document.payment_status === 'paid' ? t('sales.paid', 'Paid') : t('sales.pending', 'Pending')}
            </span>
            <span className="text-xs text-slate-500">
              {TYPE_LABEL[document.type]} · {issued.toLocaleString()} · {document.client_name}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-[38px] cursor-pointer items-center gap-2 rounded-xl bg-slate-100 px-3.5 text-xs font-semibold text-slate-700"
          >
            <Printer className="h-4 w-4" />
            {t('sales.print', 'Print')}
          </button>
          <button
            type="button"
            disabled={payment.isPending}
            onClick={() => payment.mutate(document.payment_status === 'paid' ? 'pending' : 'paid')}
            className="inline-flex h-10 cursor-pointer items-center rounded-xl bg-[#004ac6] px-4 text-xs font-semibold text-white disabled:opacity-60"
          >
            {payment.isPending
              ? t('sales.savingPayment', 'Saving...')
              : document.payment_status === 'paid'
                ? t('sales.markPending', 'Mark pending')
                : t('sales.recordPayment', 'Record payment')}
          </button>
        </div>
      </div>

      <div className="flex flex-col items-start gap-6 xl:flex-row">
        <article className="min-w-0 flex-1 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-12">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <span className="flex h-[52px] w-[52px] items-center justify-center rounded-[14px] bg-[#004ac6] font-mono text-base font-bold text-white">
                {initials}
              </span>
              <span>
                <span className="block text-lg font-bold">{company?.name}</span>
                <span className="block text-xs text-slate-500">
                  {[company?.address, company?.city].filter(Boolean).join(', ')}
                </span>
              </span>
            </div>
            <div className="text-right">
              <span className="block text-[11px] font-bold tracking-[0.16em] text-slate-500 uppercase">
                {TYPE_LABEL[document.type]}
              </span>
              <span className="mt-0.5 block font-mono text-[22px] font-bold text-[#004ac6]">{document.number}</span>
              <span className="mt-1.5 block text-xs text-slate-600">
                {issued.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="my-6 h-[3px] rounded-sm bg-[#004ac6]/20" />

          <div className="flex flex-col justify-between gap-6 sm:flex-row">
            <div className="flex-1">
              <span className="block text-[10px] font-bold tracking-[0.1em] text-slate-500 uppercase">
                {t('sales.from', 'From')}
              </span>
              <span className="mt-2 block text-[13px] font-semibold">{company?.name}</span>
              <span className="mt-1 block text-xs leading-relaxed text-slate-600">
                {company?.email}
                <br />
                {[company?.address, company?.city, company?.country].filter(Boolean).join(', ')}
              </span>
            </div>
            <div className="flex-1">
              <span className="block text-[10px] font-bold tracking-[0.1em] text-slate-500 uppercase">
                {t('sales.billTo', 'Bill to')}
              </span>
              <span className="mt-2 block text-[13px] font-semibold">{document.client_name}</span>
              {document.client_company ? (
                <span className="block text-xs text-slate-600">{document.client_company}</span>
              ) : null}
              <span className="mt-1 block font-mono text-xs text-slate-600">
                {[document.client_code, document.client_nif || document.client_nie, document.client_phone]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </div>
            <div className="w-full shrink-0 rounded-xl border border-slate-200 bg-slate-50 p-3.5 sm:w-44">
              <span className="block text-[10px] font-bold tracking-[0.1em] text-slate-500 uppercase">
                {t('sales.amountDue', 'Amount due')}
              </span>
              <span className="mt-1.5 block font-mono text-2xl font-bold text-[#004ac6]">
                {formatCents(due, currency)}
              </span>
            </div>
          </div>

          <div className="mt-7 overflow-x-auto rounded-xl border border-slate-200">
            <div className="min-w-[640px]">
              <div className="flex bg-[#eff4ff] px-4 py-2.5 text-[10px] font-bold tracking-[0.08em] text-slate-700 uppercase">
                <span className="w-8">#</span>
                <span className="min-w-0 flex-1">{t('sales.article', 'Article')}</span>
                <span className="w-14 text-right">{t('sales.qty', 'Qty')}</span>
                <span className="w-24 text-right">{t('sales.price', 'Price')}</span>
                <span className="w-16 text-right">{t('sales.dto', 'Dto')}</span>
                <span className="w-14 text-right">IVA</span>
                <span className="w-24 text-right">{t('sales.total', 'Total')}</span>
              </div>
              {(document.lines ?? []).map((line) => (
                <div key={line.position} className="flex items-center border-t border-slate-100 px-4 py-3 text-[13px]">
                  <span className="w-8 font-mono text-xs text-slate-400">{line.position}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{line.article}</span>
                    <span className="block font-mono text-[11px] text-slate-500">
                      {[line.sr_number, line.description].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span className="w-14 text-right font-mono">{line.quantity}</span>
                  <span className="w-24 text-right font-mono">{formatCents(line.unit_price, currency)}</span>
                  <span className="w-16 text-right font-mono text-slate-500">{line.discount_percent}%</span>
                  <span className="w-14 text-right font-mono text-slate-500">{line.iva_percent}%</span>
                  <span className="w-24 text-right font-mono font-bold">{formatCents(line.total_cents, currency)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-col items-start justify-between gap-8 sm:flex-row">
            <div className="w-full max-w-sm">
              <span className="block text-[10px] font-bold tracking-[0.1em] text-slate-500 uppercase">
                {t('sales.taxBreakdown', 'Tax breakdown')}
              </span>
              <div className="mt-2.5 overflow-hidden rounded-[10px] border border-slate-200">
                <div className="flex bg-slate-50 px-3 py-2 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  <span className="flex-1">{t('sales.rate', 'Rate')}</span>
                  <span className="w-24 text-right">{t('sales.base', 'Base')}</span>
                  <span className="w-24 text-right">{t('sales.taxTotal', 'Tax')}</span>
                </div>
                {[...groups.entries()].map(([rate, group]) => (
                  <div key={rate} className="flex border-t border-slate-100 px-3 py-2 text-xs">
                    <span className="flex-1 font-mono">{rate}%</span>
                    <span className="w-24 text-right font-mono">{formatCents(group.base, currency)}</span>
                    <span className="w-24 text-right font-mono">{formatCents(group.tax, currency)}</span>
                  </div>
                ))}
              </div>
              {document.notes ? (
                <p className="mt-4 text-xs leading-relaxed text-slate-500">{document.notes}</p>
              ) : null}
            </div>
            <div className="w-full sm:w-72">
              <div className="flex justify-between text-[13px] text-slate-600">
                <span>{t('sales.base', 'Taxable base')}</span>
                <span className="font-mono">{formatCents(document.base_cents, currency)}</span>
              </div>
              <div className="mt-2 flex justify-between text-[13px] text-slate-600">
                <span>{t('sales.taxTotal', 'Tax')}</span>
                <span className="font-mono">{formatCents(document.tax_cents, currency)}</span>
              </div>
              <div className="mt-3.5 flex items-baseline justify-between border-t-2 border-[#004ac6]/20 pt-3.5">
                <span className="text-sm font-bold">{t('sales.grandTotal', 'Total')}</span>
                <span className="font-mono text-3xl font-bold tracking-tight text-[#004ac6]">
                  {formatCents(document.total_cents, currency)}
                </span>
              </div>
              <div className="mt-2.5 flex justify-end">
                <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', paymentClass(document.payment_status))}>
                  {document.payment_status === 'paid'
                    ? t('sales.paidInFull', 'Paid')
                    : t('sales.pendingPayment', 'Pending payment')}
                </span>
              </div>
            </div>
          </div>
        </article>

        <aside className="no-print flex w-full shrink-0 flex-col gap-4 xl:w-80">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <span className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
              {t('sales.amountDue', 'Amount due')}
            </span>
            <div className="mt-2 font-mono text-3xl font-bold tracking-tight">{formatCents(due, currency)}</div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <span
                className="block h-full bg-emerald-600"
                style={{ width: document.payment_status === 'paid' ? '100%' : '0%' }}
              />
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <span className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
              {t('sales.clientHeading', 'Client')}
            </span>
            <p className="mt-3 text-sm font-bold">{document.client_name}</p>
            <p className="font-mono text-[11px] text-slate-500">
              {[document.client_code, document.client_company, document.client_nif || document.client_nie, document.client_phone]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default InvoiceDetail
