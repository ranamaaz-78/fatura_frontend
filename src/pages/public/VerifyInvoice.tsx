import { useQuery } from '@tanstack/react-query'
import { BadgeCheck, CircleAlert, FileText, SearchX } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Logo } from '../../components/brand/Logo'
import { LanguageSwitcher } from '../../components/ui/LanguageSwitcher'
import { Skeleton } from '../../components/ui/Skeleton'
import { t } from '../../i18n'
import { formatCents } from '../../lib/money'
import { formatLongDate } from '../../lib/format'
import { verifyInvoice } from '../../services/invoiceVerification'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#e5eeff] py-3 text-[15px] last:border-b-0">
      <span className="text-[#64748b]">{label}</span>
      <span className="text-right font-semibold text-[#0b1c30]">{children}</span>
    </div>
  )
}

/** What the QR code on a printed invoice opens: confirms the invoice is genuine, without showing the customer. */
export default function VerifyInvoicePage() {
  const { code = '' } = useParams()
  const query = useQuery({ queryKey: ['verify-invoice', code], queryFn: () => verifyInvoice(code), retry: false })
  const invoice = query.data

  const state = query.isPending ? 'loading' : !invoice ? 'missing' : invoice.voided ? 'voided' : 'valid'

  const tone = {
    valid: { box: 'bg-[#e6f9f1] text-[#007d55]', icon: <BadgeCheck className="h-8 w-8" />, title: t('verify.valid', 'Genuine invoice'), body: t('verify.validBody', 'This invoice was issued by the company below and is valid.') },
    voided: { box: 'bg-[#fff4e0] text-[#b45309]', icon: <CircleAlert className="h-8 w-8" />, title: t('verify.voided', 'Invoice with a credit note'), body: t('verify.voidedBody', 'This invoice is genuine, but it was cancelled and is no longer valid.') },
    missing: { box: 'bg-[#ffe9ee] text-[#be123c]', icon: <SearchX className="h-8 w-8" />, title: t('verify.missing', 'Invoice not found'), body: t('verify.missingBody', 'We could not find an invoice for this code. Check that you scanned the whole code, and be careful with this document.') },
    loading: null,
  }[state]

  return (
    <div className="flex min-h-screen flex-col bg-[#f8f9ff] text-[#0b1c30]">
      <header className="mx-auto flex w-full max-w-[560px] items-center justify-between gap-4 px-5 pt-6">
        <Link to="/" aria-label={t('app.name', 'YK Digital Solutions')}>
          <Logo on="light" className="h-9" />
        </Link>
        <LanguageSwitcher tone="light" />
      </header>

      <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col justify-center px-5 py-8">
        <div className="rounded-[24px] border border-[#e5eeff] bg-white p-6 shadow-[0_18px_40px_rgba(2,6,23,0.08)] sm:p-8">
          {state === 'loading' || !tone ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-14 w-14 rounded-2xl" />
              <Skeleton className="h-7 w-2/3 rounded-lg" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ) : (
            <>
              <span className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${tone.box}`}>{tone.icon}</span>
              <h1 className="mt-4 text-[24px] leading-tight font-extrabold tracking-[-0.02em]">{tone.title}</h1>
              <p className="mt-1.5 text-[15px] leading-relaxed text-[#434655]">{tone.body}</p>

              {invoice?.company.is_demo ? (
                <p role="note" className="mt-5 rounded-xl border border-[#c3d4ff] bg-[#eff4ff] px-4 py-3 text-sm font-semibold text-[#004ac6]">
                  {t('demo.verifyNote', 'This is a demo invoice, made for practice. It is not a real invoice.')}
                </p>
              ) : null}

              {invoice ? (
                <div className="mt-6 rounded-2xl border border-[#e5eeff] px-4">
                  <Row label={t('verify.number', 'Invoice no.')}>{invoice.number}</Row>
                  <Row label={t('verify.issuedBy', 'Issued by')}>{invoice.company.name}</Row>
                  {invoice.company.tax_id ? <Row label="NIF/CIF">{invoice.company.tax_id}</Row> : null}
                  <Row label={t('verify.date', 'Issue date')}>{invoice.issued_at ? formatLongDate(invoice.issued_at) : '—'}</Row>
                  <Row label={t('verify.total', 'Total')}>{invoice.currency ? formatCents(invoice.total_cents, invoice.currency) : '—'}</Row>
                  {invoice.voided && invoice.voided_at ? <Row label={t('verify.voidedOn', 'Cancelled on')}>{formatLongDate(invoice.voided_at)}</Row> : null}
                </div>
              ) : null}

              {invoice ? (
                <Link
                  to={`/verify/${code}/invoice`}
                  className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-[#004ac6] px-6 text-[15px] font-semibold text-white shadow-[0_10px_24px_rgba(0,74,198,0.25)] transition-colors hover:bg-[#2563eb]"
                >
                  <FileText className="h-[18px] w-[18px]" />
                  {t('verify.viewInvoice', 'View invoice')}
                </Link>
              ) : null}
            </>
          )}
        </div>
        <p className="mt-4 text-center text-[12.5px] text-[#64748b]">
          {t('verify.privacy', 'This link is private to whoever holds the invoice. Do not share it publicly.')}
        </p>
      </main>
    </div>
  )
}
