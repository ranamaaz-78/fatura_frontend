import { CircleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { formatDate } from '../../lib/format'
import { formatCents } from '../../lib/money'
import type { Company } from '../../types/module01'
import { saleDisplayStatus, type SaleDisplayStatus, type SaleDocument, type SaleLine } from '../../types/sales'

export type PrintSheetProps = {
  document: SaleDocument
  company: Company | null
  currency: string
}

type SheetProps = PrintSheetProps & {
  lines: SaleLine[]
  issued: string
}

function Label({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('block text-[8px] font-bold tracking-[0.14em] text-[#64748b] uppercase', className)}>
      {children}
    </span>
  )
}

function paymentText(status: SaleDisplayStatus): string {
  if (status === 'voided') return t('sales.voided', 'Voided')
  if (status === 'partial') return t('sales.partial', 'Partial')
  return status === 'paid' ? t('sales.paid', 'Paid') : t('sales.pending', 'Pending')
}

function PaymentPill({ status, compact = false }: { status: SaleDisplayStatus; compact?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-bold uppercase',
        compact
          ? 'mt-2 gap-[5px] px-[11px] py-[3px] text-[10px] tracking-[0.08em]'
          : 'gap-1.5 px-3 py-1 text-[11px] tracking-[0.06em]',
        status === 'voided'
          ? 'border-[#fecdd3] bg-[#fff1f2] text-[#be123c]'
          : status === 'partial'
            ? 'border-[#bae6fd] bg-[#f0f9ff] text-[#0369a1]'
            : status === 'paid'
              ? 'border-[#a7f3d0] bg-[#ecfdf5] text-[#047857]'
              : 'border-[#fde68a] bg-[#fffbeb] text-[#b45309]',
      )}
    >
      {paymentText(status)}
    </span>
  )
}

function taxId(document: SaleDocument): string | null {
  return document.client_nif || document.client_nie
}

function clientTitle(document: SaleDocument): string {
  return document.client_company || document.client_name
}

function clientAttn(document: SaleDocument): string | null {
  return document.client_company ? document.client_name : null
}

function companyInitials(company: Company | null): string {
  const name = company?.name?.trim() || 'FA'
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function companyPlace(company: Company | null): string[] {
  if (!company) return []
  const lines: string[] = []
  if (company.address) lines.push(company.address)
  const cityCountry = [company.city, company.country].filter(Boolean).join(', ')
  if (cityCountry) lines.push(cityCountry)
  return lines
}

function companyContactLine(company: Company | null, includeEmail: boolean): string {
  if (!company) return ''
  const parts = [
    company.address,
    [company.city, company.country].filter(Boolean).join(', ') || null,
    includeEmail ? company.email : null,
  ].filter(Boolean)
  return parts.join(' · ')
}

function qtyText(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value)
}

function taxGroups(lines: SaleLine[]): { rate: number; base: number; tax: number }[] {
  const groups = new Map<number, { base: number; tax: number }>()
  for (const line of lines) {
    const group = groups.get(line.iva_percent) ?? { base: 0, tax: 0 }
    group.base += line.base_cents
    group.tax += line.tax_cents
    groups.set(line.iva_percent, group)
  }
  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([rate, group]) => ({ rate, ...group }))
}

function SheetFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <article
      id="printable-invoice"
      className={cn(
        'relative mx-auto box-border h-[1123px] w-[794px] overflow-hidden bg-white text-[#0f172a] shadow-[0_1px_4px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/80 print:fixed print:inset-0 print:mx-0 print:h-full print:w-full print:shadow-none print:ring-0',
        className,
      )}
    >
      {children}
    </article>
  )
}

function SheetBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('box-border flex h-full min-h-0 flex-col', className)}>
      {children}
    </div>
  )
}

function LogoMark({ company, outline = false }: { company: Company | null; outline?: boolean }) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center font-mono font-bold',
        outline
          ? 'h-[52px] w-[52px] rounded-[10px] border-2 border-[#004ac6] text-lg text-[#004ac6]'
          : 'h-14 w-14 rounded-xl bg-[#004ac6] text-[19px] tracking-[-0.02em] text-white',
      )}
    >
      {companyInitials(company)}
    </span>
  )
}

function ClientLines({ document, inline = false }: { document: SaleDocument; inline?: boolean }) {
  const attn = clientAttn(document)
  const id = taxId(document)
  if (inline) {
    return (
      <span className="mt-[3px] block text-[11.5px] leading-[1.7] text-[#475569]">
        {[attn ? `${t('sales.attn', 'Attn.')} ${attn}` : null, id ? `N.I.F/N.I.E ${id}` : null, document.client_phone]
          .filter(Boolean)
          .join(' · ')}
      </span>
    )
  }
  return (
    <span className="mt-[3px] block text-[11.5px] leading-[1.7] text-[#475569]">
      {attn ? <span className="block">{t('sales.attn', 'Attn.')} {attn}</span> : null}
      {id ? <span className="block font-mono">N.I.F/N.I.E {id}</span> : null}
      {document.client_phone ? <span className="block font-mono">{document.client_phone}</span> : null}
    </span>
  )
}

function InvoiceSheet({ document, company, currency, lines, issued }: SheetProps) {
  const display = saleDisplayStatus(document)
  const due = display === 'pending' ? document.total_cents : 0
  const groups = taxGroups(lines)
  const place = companyPlace(company)
  const meta = [
    { label: t('sales.invoiceNumber', 'Invoice number'), text: document.number, accent: false },
    { label: t('sales.issueDate', 'Issue date'), text: issued, accent: false },
    {
      label: t('sales.payment', 'Payment'),
      text: paymentText(display),
      accent: false,
    },
    { label: t('sales.amountDue', 'Amount due'), text: formatCents(due, currency), accent: true },
  ]

  return (
    <SheetFrame>
      <span className="absolute inset-x-0 top-0 h-1.5 bg-[#004ac6]" />
      <SheetBody className="px-[52px] pt-12 pb-10">
        <div className="flex items-start justify-between gap-8">
          <div className="flex items-center gap-3.5">
            <LogoMark company={company} />
            <span>
              <span className="block text-[17px] font-bold tracking-[-0.01em]">{company?.name}</span>
              <span className="mt-[3px] block text-[11px] leading-relaxed text-[#64748b]">
                {companyContactLine(company, true)}
              </span>
            </span>
          </div>
          <div className="shrink-0 text-right">
            <span className="block text-[19px] font-extrabold tracking-[0.24em] text-[#004ac6]">INVOICE</span>
            <span className="mt-[7px] ml-auto block h-0.5 w-[190px] bg-[#004ac6]" />
            <span className="mt-2.5 block font-mono text-[15px] font-bold">{document.number}</span>
            <PaymentPill status={display} compact />
          </div>
        </div>

        <div className="mt-[22px] flex overflow-hidden rounded-[10px] border border-[#e2e8f0]">
          {meta.map((item, index) => (
            <div
              key={item.label}
              className={cn(
                'box-border flex-1 px-4 py-[11px]',
                index < meta.length - 1 && 'border-r border-[#e2e8f0]',
                item.accent && 'bg-[#f5f8ff]',
              )}
            >
              <Label>{item.label}</Label>
              <span
                className={cn(
                  'mt-[3px] block font-mono text-[13px] font-bold',
                  item.accent ? 'text-[#004ac6]' : 'text-[#0f172a]',
                )}
              >
                {item.text}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-stretch gap-[18px]">
          <div className="flex-1 rounded-[10px] border border-[#e2e8f0] px-[18px] py-4">
            <Label>{t('sales.issuedBy', 'Issued by')}</Label>
            <span className="mt-[7px] block text-[13px] font-bold">{company?.name}</span>
            <span className="mt-[3px] block text-[11.5px] leading-[1.7] text-[#475569]">
              {place.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
              {company?.email ? <span className="block">{company.email}</span> : null}
            </span>
          </div>
          <div className="flex-1 rounded-[10px] border border-[#dbe1ff] bg-[#f5f8ff] px-[18px] py-4">
            <Label className="text-[#004ac6]">{t('sales.billTo', 'Bill to')}</Label>
            <span className="mt-[7px] block text-[13px] font-bold">{clientTitle(document)}</span>
            <ClientLines document={document} />
          </div>
        </div>

        <div className="mt-[22px] overflow-hidden rounded-[10px] border border-[#e2e8f0]">
          <div className="flex items-center bg-[#004ac6] px-3.5 py-[9px] text-[8.5px] font-bold tracking-[0.12em] text-white uppercase">
            <span className="w-6">#</span>
            <span className="min-w-0 flex-1">{t('sales.article', 'Article')}</span>
            <span className="w-[50px] text-right">{t('sales.qty', 'Qty')}</span>
            <span className="w-[82px] text-right">{t('sales.price', 'Price')}</span>
            <span className="w-[54px] text-right">{t('sales.dto', 'Dto %')}</span>
            <span className="w-[54px] text-right">IVA %</span>
            <span className="w-24 text-right">{t('sales.total', 'Total')}</span>
          </div>
          {lines.map((line, index) => (
            <div
              key={line.position}
              className={cn(
                'flex items-center border-t border-[#f1f5f9] px-3.5 py-[9px]',
                index % 2 === 1 && 'bg-[#fafbff]',
              )}
            >
              <span className="w-6 font-mono text-[11px] text-[#94a3b8]">{line.position}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold">{line.article}</span>
                {line.sr_number ? (
                  <span className="block font-mono text-[9.5px] text-[#94a3b8]">{line.sr_number}</span>
                ) : null}
              </span>
              <span className="w-[50px] text-right font-mono text-xs">{qtyText(line.quantity)}</span>
              <span className="w-[82px] text-right font-mono text-xs">{formatCents(line.unit_price, currency)}</span>
              <span className="w-[54px] text-right font-mono text-xs text-[#64748b]">{line.discount_percent}</span>
              <span className="w-[54px] text-right font-mono text-xs text-[#64748b]">{line.iva_percent}</span>
              <span className="w-24 text-right font-mono text-[12.5px] font-bold">
                {formatCents(line.total_cents, currency)}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-[22px] flex items-start gap-[22px]">
          <div className="min-w-0 flex-1">
            <Label>{t('sales.taxBreakdown', 'Tax breakdown')}</Label>
            <div className="mt-2 overflow-hidden rounded-[10px] border border-[#e2e8f0]">
              <div className="flex bg-[#f8fafc] px-3 py-[7px] text-[8px] font-bold tracking-[0.12em] text-[#64748b] uppercase">
                <span className="min-w-0 flex-1">{t('sales.rate', 'Rate')}</span>
                <span className="w-[104px] text-right">{t('sales.base', 'Base')}</span>
                <span className="w-[92px] text-right">{t('sales.taxTotal', 'Tax')}</span>
              </div>
              {groups.map((group) => (
                <div key={group.rate} className="flex border-t border-[#f1f5f9] px-3 py-2 text-xs">
                  <span className="min-w-0 flex-1 font-mono">{group.rate}%</span>
                  <span className="w-[104px] text-right font-mono">{formatCents(group.base, currency)}</span>
                  <span className="w-[92px] text-right font-mono">{formatCents(group.tax, currency)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3.5 rounded-[10px] border border-[#e2e8f0] px-3.5 py-3">
              <Label>{t('sales.payment', 'Payment')}</Label>
              <span className="mt-1.5 block text-[11.5px] leading-[1.7] text-[#475569]">
                {display === 'voided'
                  ? t('sales.voided', 'Voided')
                  : display === 'paid'
                    ? t('sales.paidInFull', 'Paid')
                    : t('sales.pendingPayment', 'Pending payment')}
                <br />
                {t('sales.reference', 'Reference')} <span className="font-mono text-[#0f172a]">{document.number}</span>
              </span>
            </div>
          </div>

          <div className="w-[286px] shrink-0">
            <div className="overflow-hidden rounded-[10px] border border-[#e2e8f0]">
              <div className="flex flex-col gap-2 px-4 py-3 text-xs text-[#475569]">
                <span className="flex justify-between">
                  <span>{t('sales.taxableBase', 'Taxable base')}</span>
                  <span className="font-mono">{formatCents(document.base_cents, currency)}</span>
                </span>
                <span className="flex justify-between">
                  <span>{t('sales.taxTotal', 'Tax')}</span>
                  <span className="font-mono">{formatCents(document.tax_cents, currency)}</span>
                </span>
              </div>
              <div className="flex items-baseline justify-between border-t-2 border-[#004ac6] bg-[#f5f8ff] px-4 py-3.5">
                <span className="text-xs font-extrabold tracking-[0.06em] uppercase">{t('sales.total', 'Total')}</span>
                <span className="font-mono text-[25px] font-extrabold tracking-[-0.02em] text-[#004ac6]">
                  {formatCents(document.total_cents, currency)}
                </span>
              </div>
            </div>
            {display === 'pending' ? (
              <div className="mt-2.5 flex items-baseline justify-between rounded-[10px] border border-[#fde68a] bg-[#fffbeb] px-4 py-[11px]">
                <span className="text-[11px] font-bold text-[#92400e]">{t('sales.amountDue', 'Amount due')}</span>
                <span className="font-mono text-[15px] font-extrabold text-[#92400e]">{formatCents(due, currency)}</span>
              </div>
            ) : null}
          </div>
        </div>

        {document.notes ? (
          <div className="mt-5">
            <Label>{t('sales.notes', 'Notes')}</Label>
            <p className="mt-1.5 mb-0 text-[11.5px] leading-[1.65] text-[#475569]">{document.notes}</p>
          </div>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-6 border-t border-[#e2e8f0] pt-3.5">
          <span className="text-[9.5px] leading-[1.7] text-[#94a3b8]">
            {[company?.name, company?.email].filter(Boolean).join(' · ')}
            <br />
            {t('sales.thankYou', 'Thank you for your business.')}
          </span>
          <span className="font-mono text-[9px] text-[#94a3b8]">
            {document.number} · {t('sales.pageOne', 'page 1 of 1')}
          </span>
        </div>
      </SheetBody>
    </SheetFrame>
  )
}

function AlbaranSheet({ document, currency, lines, issued }: SheetProps) {
  const units = lines.reduce((sum, line) => sum + line.quantity, 0)

  return (
    <SheetFrame>
      <SheetBody className="px-14 pt-[52px] pb-11">
        <div className="flex items-center justify-between gap-6 rounded-md border-[3px] border-[#004ac6] px-[22px] py-[18px]">
          <div>
            <h1 className="m-0 text-[54px] leading-[0.95] font-black tracking-[-0.04em] text-[#004ac6]">ALBARÁN</h1>
            <span className="mt-1 block text-[13px] font-bold tracking-[0.22em] text-[#475569] uppercase">
              {t('sales.typeAlbaran', 'Delivery note')}
            </span>
          </div>
          <div className="text-right">
            <Label className="text-[9px]">{t('sales.number', 'Number')}</Label>
            <span className="block font-mono text-xl font-extrabold">{document.number}</span>
            <span className="mt-2.5 block">
              <Label className="text-[9px]">{t('sales.date', 'Date')}</Label>
            </span>
            <span className="block font-mono text-base font-bold">{issued}</span>
          </div>
        </div>

        <div className="mt-[26px] flex gap-5">
          <div className="flex-[1.4] rounded-lg border border-[#cbd5e1] px-[18px] py-4">
            <Label className="text-[9px]">{t('sales.deliverTo', 'Deliver to')}</Label>
            <span className="mt-2 block text-base font-extrabold">{clientTitle(document)}</span>
            <span className="mt-1 block text-xs leading-[1.7] text-[#334155]">
              {clientAttn(document) ? (
                <span className="block">
                  {t('sales.attn', 'Attn.')} {clientAttn(document)}
                </span>
              ) : null}
              <span className="font-mono">
                {[taxId(document) ? `N.I.F/N.I.E ${taxId(document)}` : null, document.client_phone]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </span>
          </div>
          <div className="flex flex-1 flex-col justify-between rounded-lg border border-[#cbd5e1] px-[18px] py-4">
            <span>
              <Label className="text-[9px]">{t('sales.itemsDelivered', 'Items delivered')}</Label>
              <span className="mt-1.5 block font-mono text-[28px] font-extrabold">{qtyText(units)}</span>
              <span className="block text-[11px] text-[#64748b]">
                {`units across ${lines.length} ${lines.length === 1 ? 'line' : 'lines'}`}
              </span>
            </span>
            <span className="mt-2.5 self-start">
              <PaymentPill status={saleDisplayStatus(document)} />
            </span>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-[#cbd5e1]">
          <div className="flex items-center bg-[#f1f5f9] px-3 py-2.5 text-[9px] font-extrabold tracking-[0.1em] text-[#334155] uppercase">
            <span className="w-7">#</span>
            <span className="min-w-0 flex-1">{t('sales.article', 'Article')}</span>
            <span className="w-[70px] text-right">{t('sales.qty', 'Qty')}</span>
            <span className="w-24 text-right">{t('sales.price', 'Price')}</span>
            <span className="w-[70px] text-right">{t('sales.dto', 'Dto %')}</span>
            <span className="w-[110px] text-right">{t('sales.total', 'Total')}</span>
          </div>
          {lines.map((line) => (
            <div
              key={line.position}
              className="flex items-center border-t border-[#e2e8f0] px-3 py-[13px] text-[13px]"
            >
              <span className="w-7 font-mono text-[#94a3b8]">{line.position}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{line.article}</span>
                {line.sr_number ? (
                  <span className="block font-mono text-[10px] text-[#94a3b8]">{line.sr_number}</span>
                ) : null}
              </span>
              <span className="w-[70px] text-right font-mono text-[15px] font-bold">{qtyText(line.quantity)}</span>
              <span className="w-24 text-right font-mono">{formatCents(line.unit_price, currency)}</span>
              <span className="w-[70px] text-right font-mono text-[#64748b]">{line.discount_percent}</span>
              <span className="w-[110px] text-right font-mono font-bold">{formatCents(line.total_cents, currency)}</span>
            </div>
          ))}
          <div className="flex items-center border-t-2 border-[#004ac6] bg-[#f8fafc] px-3 py-3">
            <span className="min-w-0 flex-1 text-xs font-extrabold tracking-[0.06em] uppercase">
              {t('sales.totalDelivered', 'Total delivered (net)')}
            </span>
            <span className="w-[110px] text-right font-mono text-lg font-extrabold">
              {formatCents(document.total_cents, currency)}
            </span>
          </div>
        </div>

        {document.notes ? (
          <div className="mt-[22px]">
            <Label className="text-[9px]">{t('sales.notes', 'Notes')}</Label>
            <p className="mt-1.5 mb-0 text-xs leading-relaxed text-[#334155]">{document.notes}</p>
          </div>
        ) : null}

        <div className="mt-auto" />
        <div className="mt-4 flex justify-between border-t border-[#e2e8f0] pt-3 text-[10px] text-[#94a3b8]">
          <span>{t('sales.albaranFooter', 'This delivery note is not a tax invoice.')}</span>
          <span className="font-mono">
            {document.number} · {t('sales.pageOne', 'page 1 of 1')}
          </span>
        </div>
      </SheetBody>
    </SheetFrame>
  )
}

function QuotationSheet({ document, company, currency, lines, issued }: SheetProps) {
  const terms = [
    { label: t('sales.issued', 'Issued'), text: issued, accent: true },
    {
      label: t('sales.lines', 'Lines'),
      text: String(lines.length),
      accent: false,
    },
    {
      label: t('sales.document', 'Document'),
      text: t('sales.quotationTagShort', 'Not a tax invoice'),
      accent: false,
    },
  ]

  return (
    <SheetFrame>
      <span className="absolute inset-y-0 left-0 w-2.5 bg-[#004ac6]" />
      <SheetBody className="px-[52px] pt-12 pb-10">
        <div className="flex items-start justify-between gap-7">
          <div className="flex items-center gap-3.5">
            <LogoMark company={company} />
            <span>
              <span className="block text-[17px] font-bold tracking-[-0.01em]">{company?.name}</span>
              <span className="mt-[3px] block text-[11px] leading-relaxed text-[#64748b]">
                {companyContactLine(company, false)}
                {company?.email ? (
                  <>
                    <br />
                    {company.email}
                  </>
                ) : null}
              </span>
            </span>
          </div>
          <div className="shrink-0 text-right">
            <span className="inline-block rounded-[10px] border-2 border-[#004ac6] px-5 py-[9px] text-[22px] font-black tracking-[0.18em] text-[#004ac6]">
              QUOTATION
            </span>
            <span className="mt-2.5 block font-mono text-[15px] font-bold">{document.number}</span>
            <span className="mt-0.5 block text-[11px] text-[#64748b]">
              {t('sales.issued', 'Issued')} <span className="font-mono">{issued}</span>
            </span>
          </div>
        </div>

        <div className="mt-[22px] flex gap-3">
          {terms.map((item) => (
            <div
              key={item.label}
              className={cn(
                'box-border flex-1 rounded-[10px] px-4 py-3',
                item.accent ? 'border border-[#dbe1ff] bg-[#f5f8ff]' : 'border border-[#e2e8f0]',
              )}
            >
              <Label>{item.label}</Label>
              <span
                className={cn(
                  'mt-1 block text-[13px] font-bold',
                  item.accent ? 'font-mono text-[#004ac6]' : 'text-[#0f172a]',
                )}
              >
                {item.text}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-stretch gap-[18px]">
          <div className="min-w-0 flex-[1.3] rounded-[10px] border border-[#dbe1ff] bg-[#f5f8ff] px-[18px] py-4">
            <Label className="text-[#004ac6]">{t('sales.quotationFor', 'Quotation for')}</Label>
            <span className="mt-[7px] block text-sm font-bold">{clientTitle(document)}</span>
            <ClientLines document={document} inline />
          </div>
          {document.notes ? (
            <div className="flex-1 rounded-[10px] border border-dashed border-[#94a3b8] px-[18px] py-4">
              <Label>{t('sales.subject', 'Subject')}</Label>
              <span className="mt-[7px] block text-xs leading-relaxed text-[#475569]">{document.notes}</span>
            </div>
          ) : null}
        </div>

        <div className="mt-5 overflow-hidden rounded-[10px] border border-[#dbe1ff]">
          <div className="flex items-center border-b border-[#dbe1ff] bg-[#eff4ff] px-3.5 py-[9px] text-[8.5px] font-extrabold tracking-[0.1em] text-[#1e293b] uppercase">
            <span className="w-[22px]">#</span>
            <span className="min-w-0 flex-1">{t('sales.article', 'Article')}</span>
            <span className="w-11 text-right">{t('sales.qty', 'Qty')}</span>
            <span className="w-[74px] text-right">{t('sales.price', 'Price')}</span>
            <span className="w-12 text-right">{t('sales.dto', 'Dto %')}</span>
            <span className="w-12 text-right">IVA %</span>
            <span className="w-[90px] text-right">{t('sales.priceNet', 'Without tax')}</span>
            <span className="w-[92px] text-right">{t('sales.priceGross', 'With tax')}</span>
          </div>
          {lines.map((line, index) => (
            <div
              key={line.position}
              className={cn(
                'flex items-center border-t border-[#f1f5f9] px-3.5 py-[9px]',
                index % 2 === 1 && 'bg-[#fafbff]',
              )}
            >
              <span className="w-[22px] font-mono text-[11px] text-[#94a3b8]">{line.position}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold">{line.article}</span>
                {line.sr_number ? (
                  <span className="block font-mono text-[9.5px] text-[#94a3b8]">{line.sr_number}</span>
                ) : null}
              </span>
              <span className="w-11 text-right font-mono text-xs">{qtyText(line.quantity)}</span>
              <span className="w-[74px] text-right font-mono text-xs">{formatCents(line.unit_price, currency)}</span>
              <span className="w-12 text-right font-mono text-xs text-[#64748b]">{line.discount_percent}</span>
              <span className="w-12 text-right font-mono text-xs text-[#64748b]">{line.iva_percent}</span>
              <span className="w-[90px] text-right font-mono text-xs text-[#475569]">
                {formatCents(line.base_cents, currency)}
              </span>
              <span className="w-[92px] text-right font-mono text-[12.5px] font-bold">
                {formatCents(line.total_cents, currency)}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-start gap-[22px]">
          <div className="min-w-0 flex-1 rounded-[10px] border border-[#e2e8f0] px-4 py-3.5">
            <Label>{t('sales.scope', 'Scope and conditions')}</Label>
            <span className="mt-[7px] block text-[11.5px] leading-[1.75] text-[#475569]">
              {t('sales.scopeNetGross', 'Prices shown both without and with tax, at the rates in force today.')}
              <br />
              {t('sales.scopeAccept', 'Delivery starts once the quotation is accepted in writing.')}
              <br />
              {t('sales.scopeStock', 'Stock is not reserved until acceptance.')}
            </span>
          </div>
          <div className="w-[286px] shrink-0 overflow-hidden rounded-[10px] border border-[#dbe1ff]">
            <div className="flex flex-col gap-2 px-4 py-3 text-xs text-[#475569]">
              <span className="flex justify-between">
                <span>{t('sales.totalWithoutTax', 'Total without tax')}</span>
                <span className="font-mono">{formatCents(document.base_cents, currency)}</span>
              </span>
              <span className="flex justify-between">
                <span>{t('sales.taxTotal', 'Tax')}</span>
                <span className="font-mono">{formatCents(document.tax_cents, currency)}</span>
              </span>
            </div>
            <div className="flex items-baseline justify-between bg-[#004ac6] px-4 py-3.5 text-white">
              <span className="text-[11px] font-extrabold tracking-[0.08em] uppercase">
                {t('sales.totalWithTax', 'Total with tax')}
              </span>
              <span className="font-mono text-[23px] font-extrabold tracking-[-0.02em]">
                {formatCents(document.total_cents, currency)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-5 border-t border-[#e2e8f0] pt-3.5">
          <span className="inline-flex items-center gap-[7px] text-[11px] font-bold text-[#004ac6]">
            <CircleAlert className="h-[15px] w-[15px]" strokeWidth={2} />
            {t('sales.quotationFooter', 'This is a quotation, not a tax invoice.')}
          </span>
          <span className="font-mono text-[9px] text-[#94a3b8]">
            {document.number} · {t('sales.pageOne', 'page 1 of 1')}
          </span>
        </div>
      </SheetBody>
    </SheetFrame>
  )
}

function ProformaSheet({ document, company, currency, lines, issued }: SheetProps) {
  const units = lines.reduce((sum, line) => sum + line.quantity, 0)

  return (
    <SheetFrame>
      <SheetBody className="px-[52px] pt-12 pb-10">
        <div className="flex items-start justify-between gap-7">
          <div className="flex items-center gap-[13px]">
            <LogoMark company={company} outline />
            <span>
              <span className="block text-base font-bold tracking-[-0.01em]">{company?.name}</span>
              <span className="mt-0.5 block text-[11px] text-[#64748b]">{companyContactLine(company, false)}</span>
            </span>
          </div>
          <div className="text-right">
            <span className="inline-block rounded-md bg-[#004ac6] px-4 py-[7px] text-lg font-black tracking-[0.2em] text-white">
              PROFORMA
            </span>
            <span className="mt-2.5 block font-mono text-[15px] font-bold">{document.number}</span>
            <span className="mt-0.5 block text-[11px] text-[#64748b]">
              {t('sales.prepared', 'Prepared')} <span className="font-mono">{issued}</span>
            </span>
          </div>
        </div>

        <div className="mt-5 h-0.5 bg-[#004ac6]" />

        <div className="mt-5 flex items-stretch gap-[18px]">
          <div className="flex-[1.5] rounded-lg border border-[#cbd5e1] px-[18px] py-[15px]">
            <Label>{t('sales.preparedFor', 'Prepared for')}</Label>
            <span className="mt-[7px] block text-[15px] font-bold">{clientTitle(document)}</span>
            <ClientLines document={document} inline />
          </div>
          <div className="flex flex-1 gap-3">
            <div className="flex flex-1 flex-col justify-center rounded-lg border border-[#cbd5e1] px-4 py-[15px]">
              <Label>{t('sales.lines', 'Lines')}</Label>
              <span className="mt-1 font-mono text-2xl font-extrabold">{lines.length}</span>
            </div>
            <div className="flex flex-1 flex-col justify-center rounded-lg border border-[#cbd5e1] px-4 py-[15px]">
              <Label>{t('sales.units', 'Units')}</Label>
              <span className="mt-1 font-mono text-2xl font-extrabold">{qtyText(units)}</span>
            </div>
          </div>
        </div>

        <div className="mt-[22px] overflow-hidden rounded-lg border-2 border-[#004ac6]">
          <div className="flex items-center bg-[#004ac6] px-4 py-2.5 text-[8.5px] font-extrabold tracking-[0.14em] text-white uppercase">
            <span className="w-[30px]">#</span>
            <span className="min-w-0 flex-1">{t('sales.article', 'Article')}</span>
            <span className="w-[92px] text-right">{t('sales.qty', 'Qty')}</span>
            <span className="w-[126px] text-right">{t('sales.price', 'Price')}</span>
            <span className="w-[140px] text-right">{t('sales.total', 'Total')}</span>
          </div>
          {lines.map((line, index) => (
            <div
              key={line.position}
              className={cn(
                'flex items-center border-t border-[#e2e8f0] px-4 py-[13px]',
                index % 2 === 1 && 'bg-[#f8fafc]',
              )}
            >
              <span className="w-[30px] font-mono text-xs text-[#94a3b8]">{line.position}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold">{line.article}</span>
                {line.sr_number ? (
                  <span className="block font-mono text-[10px] text-[#94a3b8]">{line.sr_number}</span>
                ) : null}
              </span>
              <span className="w-[92px] text-right font-mono text-base font-bold">{qtyText(line.quantity)}</span>
              <span className="w-[126px] text-right font-mono text-[13px] text-[#475569]">
                {formatCents(line.unit_price, currency)}
              </span>
              <span className="w-[140px] text-right font-mono text-[13.5px] font-bold">
                {formatCents(line.total_cents, currency)}
              </span>
            </div>
          ))}
          <div className="flex items-center border-t-2 border-[#004ac6] bg-[#f8fafc] px-4 py-4">
            <span className="min-w-0 flex-1 text-xs font-extrabold tracking-[0.1em] uppercase">
              {t('sales.total', 'Total')}
            </span>
            <span className="w-[140px] text-right font-mono text-2xl font-black">
              {formatCents(document.total_cents, currency)}
            </span>
          </div>
        </div>

        <span className="mt-2 block text-[10.5px] text-[#64748b]">
          {t(
            'sales.proformaCaption',
            'Prices are the amounts agreed with the customer for this shipment. Taxes are not calculated on this document.',
          )}
        </span>

        {document.notes ? (
          <div className="mt-[22px] rounded-lg border border-[#cbd5e1] px-4 py-3.5">
            <Label>{t('sales.notes', 'Notes')}</Label>
            <p className="mt-1.5 mb-0 text-[11.5px] leading-[1.7] text-[#475569]">{document.notes}</p>
          </div>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-5 border-t border-[#e2e8f0] pt-3.5">
          <span className="text-[10.5px] text-[#64748b]">
            {t('sales.proformaFooter', 'Proforma document. Not a tax invoice and not a payment request.')}
          </span>
          <span className="font-mono text-[9px] text-[#94a3b8]">
            {document.number} · {t('sales.pageOne', 'page 1 of 1')}
          </span>
        </div>
      </SheetBody>
    </SheetFrame>
  )
}

export function PrintSheet({ document, company, currency }: PrintSheetProps) {
  const lines = document.lines ?? []
  const issued = formatDate(document.issued_at)
  const props = { document, company, currency, lines, issued }

  switch (document.type) {
    case 'albaran':
      return <AlbaranSheet {...props} />
    case 'quotation':
      return <QuotationSheet {...props} />
    case 'proforma':
      return <ProformaSheet {...props} />
    default:
      return <InvoiceSheet {...props} />
  }
}
