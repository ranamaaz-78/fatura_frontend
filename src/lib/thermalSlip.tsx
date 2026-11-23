import { QRCodeSVG } from 'qrcode.react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { documentIntlLocale, t, td } from '../i18n'
import { getPrintTemplates, loadLogoBlob } from '../services/printables'
import type { Company } from '../types/module01'
import type { PrintTemplate } from '../types/printables'
import { saleDisplayStatus, type SaleDisplayStatus, type SaleDocument, type SaleLine, type SaleType } from '../types/sales'
import { documentCountry } from './countries'
import { PUBLIC_SITE_URL } from './desktop'
import { formatDocumentCents } from './money'
import { pickPrintTemplate } from './printTheme'

/*
 * The 80 mm thermal roll slip of an invoice or a delivery note: the same details as the A4 sheet, set in one narrow
 * column for a receipt printer. It prints from its own window through the browser's print dialog, so any roll printer
 * with a Windows driver works. Black only, no greys: a thermal head turns greys into dots.
 */

/** The roll, as the slip shows on screen. */
const PAPER_MM = 80
/**
 * What an 80 mm roll printer can actually print: at most 72 mm (576 dots at 203 dpi). Many drivers still report the
 * page as 80 mm wide, and some keep a hidden left margin of about 4 mm that pushes everything right, or print only
 * 68 to 70 mm. So the slip keeps SIDE_MM clear on both sides: its text and rules end well inside what any of them prints.
 */
const PRINT_MM = 72
const SIDE_MM = 5

/** Only invoices and delivery notes are handed over the counter on a roll. */
export function hasThermalSlip(type: SaleType): boolean {
  return type === 'factura' || type === 'albaran'
}

const STYLE = `
  /*
   * No page size: a roll printer's driver has its own paper (often 80 x 3276 mm) and stops and cuts where the print
   * ends. A size set here would be a small page that the browser centres on that long paper, with metres of blank
   * roll before and after it. So the slip starts at the top of the printer's paper and is as wide as it can print.
   */
  @page { margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000; }
  body {
    width: 100%; font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.38;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  p { margin: 0; }
  .slip { width: 100%; max-width: ${PRINT_MM}mm; padding: 2mm ${SIDE_MM}mm 5mm; }
  .center { text-align: center; }
  .num { font-variant-numeric: tabular-nums; }
  .muted { font-size: 10px; }
  .strong { font-weight: 700; }

  /* Letterhead */
  .head { text-align: center; }
  .logo { display: block; margin: 0 auto 2.5mm; max-width: 48mm; max-height: 18mm; object-fit: contain; filter: grayscale(1) contrast(1.5); }
  .company { font-size: 16px; font-weight: 800; letter-spacing: 0.01em; line-height: 1.2; }
  .head .muted { margin-top: 0.6mm; }

  /* The document's name on a black band */
  .band {
    margin: 3.5mm 0 3mm; padding: 1.6mm 0; background: #000; color: #fff; text-align: center;
    font-size: 15px; font-weight: 800; letter-spacing: 0.22em; text-transform: uppercase;
  }
  .band.first { margin-top: 0; }

  /* Label : value rows */
  .meta { display: grid; grid-template-columns: auto 1fr; column-gap: 3mm; row-gap: 0.8mm; }
  .meta dt { font-size: 9.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; align-self: center; }
  .meta dd { margin: 0; text-align: right; font-weight: 600; }
  .meta dd.big { font-size: 12.5px; font-weight: 800; }
  .stamp { display: inline-block; border: 1.5px solid #000; padding: 0 1.8mm; font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
  .stamp.solid { background: #000; color: #fff; }

  /* Section heading between two dashed rules */
  .section { display: flex; align-items: center; gap: 2mm; margin: 3.5mm 0 2mm; font-size: 9.5px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; white-space: nowrap; }
  .section::before, .section::after { content: ''; flex: 1; border-top: 1px dashed #000; }
  .rule { border-top: 1px dashed #000; margin: 3mm 0; }

  /* Customer */
  .client-name { font-size: 12.5px; font-weight: 800; overflow-wrap: anywhere; }
  .client p.muted { overflow-wrap: anywhere; }

  /* Items */
  .item { display: grid; grid-template-columns: 5mm 1fr; padding: 1.6mm 0; border-bottom: 1px dotted #000; }
  .item-no { font-size: 10px; font-weight: 700; }
  .item-name { font-weight: 700; overflow-wrap: anywhere; }
  .item-detail { font-size: 10px; overflow-wrap: anywhere; }
  .item-math { display: flex; justify-content: space-between; align-items: baseline; gap: 2mm; margin-top: 0.6mm; }
  .item-math .amount { font-weight: 800; white-space: nowrap; }
  .count { margin-top: 1.6mm; text-align: right; font-size: 10px; }

  /* Totals */
  .totals { margin-top: 3mm; border-top: 2px solid #000; padding-top: 1.6mm; }
  .line { display: flex; justify-content: space-between; align-items: baseline; gap: 2mm; padding: 0.3mm 0; }
  .line > :last-child { white-space: nowrap; text-align: right; }
  .grand { display: flex; justify-content: space-between; align-items: center; gap: 2mm; margin-top: 2mm; border: 2.5px solid #000; padding: 1.8mm 2.5mm; }
  .grand span:first-child { font-size: 12px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; }
  .grand span:last-child { font-size: 19px; font-weight: 900; white-space: nowrap; }

  /* IVA by rate */
  .taxes { width: 100%; border-collapse: collapse; font-size: 10px; }
  .taxes th { padding: 0 0 0.6mm; border-bottom: 1px solid #000; font-size: 9px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; text-align: right; }
  .taxes td { padding: 0.6mm 0 0; text-align: right; }
  .taxes th:first-child, .taxes td:first-child { text-align: left; }

  .notes { white-space: pre-wrap; overflow-wrap: anywhere; font-size: 10px; }
  .terms { white-space: pre-wrap; overflow-wrap: anywhere; font-size: 9.5px; text-align: center; font-style: italic; }
  .void { margin: 0 0 3mm; border: 2.5px solid #000; padding: 1.4mm; text-align: center; font-size: 17px; font-weight: 900; letter-spacing: 0.3em; text-transform: uppercase; }
  .qr { display: flex; flex-direction: column; align-items: center; gap: 1.2mm; margin-top: 1mm; text-align: center; }
  .qr svg { display: block; padding: 1.5mm; border: 1.5px solid #000; box-sizing: content-box; }
  .sign { display: grid; grid-template-columns: 1fr 22mm; gap: 4mm; margin-top: 14mm; font-size: 9.5px; text-align: center; }
  .sign span { display: block; border-top: 1px solid #000; padding-top: 1mm; }
  .end { margin-top: 4mm; text-align: center; font-size: 9.5px; letter-spacing: 0.12em; }
  @media screen {
    html { background: #e2e8f0; }
    body { width: ${PAPER_MM}mm; margin: 20px auto; background: #fff; box-shadow: 0 10px 30px -12px rgb(15 23 42 / 0.35); }
    .slip { margin: 0 auto; padding: 5mm ${SIDE_MM}mm 7mm; }
  }
`

type SlipProps = {
  document: SaleDocument
  company: Company | null
  currency: string
  theme: PrintTemplate
  logoSrc: string | null
}

function statusText(status: SaleDisplayStatus): string {
  if (status === 'voided') return td('sales.voided', 'Voided')
  if (status === 'returned') return td('sales.returned', 'Returned')
  if (status === 'partial') return td('sales.partial', 'Partial')
  return status === 'paid' ? td('sales.paid', 'Paid') : td('sales.pending', 'Pending')
}

/** A line as the customer reads it on the A4 sheet: quantity x price less the line discount, before the bill discount. */
function lineAmounts(line: SaleLine): { base: number; total: number } {
  const base = line.base_cents + (line.bill_discount_cents ?? 0)
  return { base, total: base + Math.round(base * (line.iva_percent / 100)) }
}

function taxGroups(lines: SaleLine[]): { rate: number; base: number; tax: number }[] {
  const groups = new Map<number, { base: number; tax: number }>()
  for (const line of lines) {
    const group = groups.get(line.iva_percent) ?? { base: 0, tax: 0 }
    group.base += line.base_cents
    group.tax += line.tax_cents
    groups.set(line.iva_percent, group)
  }
  return [...groups.entries()].sort((a, b) => b[0] - a[0]).map(([rate, group]) => ({ rate, ...group }))
}

function Line({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={`line num ${className ?? ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function Section({ children }: { children: string }) {
  return <p className="section">{children}</p>
}

function ThermalSlip({ document, company, currency, theme, logoSrc }: SlipProps) {
  const invoice = document.type === 'factura'
  const lines = document.lines ?? []
  const display = saleDisplayStatus(document)
  const money = (cents: number) => formatDocumentCents(cents, currency)
  const issued = new Date(document.issued_at)
  const date = issued.toLocaleDateString(documentIntlLocale(), { day: '2-digit', month: '2-digit', year: 'numeric' })
  const time = issued.toLocaleTimeString(documentIntlLocale(), { hour: '2-digit', minute: '2-digit' })
  const street = [company?.address, [company?.postal_code, company?.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  const country = documentCountry(company?.country)
  const contact = [company?.phone, company?.email].filter(Boolean).join(' · ')
  const clientId = document.client_nif || document.client_nie
  const units = lines.reduce((sum, line) => sum + line.quantity, 0)
  const groups = invoice ? taxGroups(lines) : []
  const notes = document.notes?.trim() ?? ''
  const terms = theme.footer_notes.trim()
  const paidWith = document.payment_status === 'paid' && document.payment_method && display !== 'voided' ? document.payment_method.name : null

  return (
    <div className="slip">
      {/* A delivery note goes with the goods: like the A4 one, it carries no company details. */}
      {invoice ? (
        <div className="head">
          {theme.show_logo && logoSrc ? <img className="logo" src={logoSrc} alt="" /> : null}
          <p className="company">{company?.name}</p>
          {street ? <p className="muted">{street}</p> : null}
          {country ? <p className="muted">{country}</p> : null}
          {company?.tax_id ? (
            <p className="muted strong">
              {td('sales.taxIdLabel', 'NIF/CIF')} {company.tax_id}
            </p>
          ) : null}
          {contact ? <p className="muted">{contact}</p> : null}
        </div>
      ) : null}

      <p className={`band ${invoice ? '' : 'first'}`}>{invoice ? td('sales.invoiceTitle', 'Invoice') : td('sales.typeAlbaran', 'Delivery note')}</p>

      {display === 'voided' ? <p className="void">{td('sales.voided', 'Voided')}</p> : null}

      <dl className="meta num">
        <dt>{td('print.number', 'No.')}</dt>
        <dd className="big">{document.number}</dd>
        <dt>{td('sales.date', 'Date')}</dt>
        <dd>
          {date} · {time}
        </dd>
        <dt>{td('sales.status', 'Status')}</dt>
        <dd>
          <span className={`stamp ${display === 'paid' ? 'solid' : ''}`}>{statusText(display)}</span>
        </dd>
        {paidWith ? (
          <>
            <dt>{td('sales.payment', 'Payment')}</dt>
            <dd>{paidWith}</dd>
          </>
        ) : null}
        {display === 'voided' && document.void_reason ? (
          <>
            <dt>{td('sales.voidReason', 'Reason')}</dt>
            <dd>{document.void_reason}</dd>
          </>
        ) : null}
      </dl>

      <Section>{invoice ? td('sales.billTo', 'Bill to') : td('sales.deliverTo', 'Deliver to')}</Section>
      <div className="client">
        <p className="client-name">{document.client_company || document.client_name}</p>
        {document.client_company ? (
          <p className="muted">
            {td('sales.attn', 'Attn.')} {document.client_name}
          </p>
        ) : null}
        {clientId ? <p className="muted">N.I.F / N.I.E {clientId}</p> : null}
        {document.client_phone ? (
          <p className="muted">
            {td('print.phone', 'Phone')} {document.client_phone}
          </p>
        ) : null}
        {document.client_address ? <p className="muted">{document.client_address}</p> : null}
      </div>

      <Section>{td('sales.items', 'Items')}</Section>
      {lines.map((line) => {
        const detail = [line.brand?.trim(), line.description?.trim()].filter(Boolean).join(' · ')
        const amounts = lineAmounts(line)
        const pricing = [
          `${line.quantity} × ${money(line.unit_price)}`,
          line.discount_percent ? `${td('print.dto', 'Disc.')} ${line.discount_percent}%` : null,
          invoice ? `IVA ${line.iva_percent}%` : null,
        ]
          .filter(Boolean)
          .join('  ·  ')
        return (
          <div key={line.position} className="item">
            <span className="item-no num">{line.position}</span>
            <div>
              <p className="item-name">{line.article}</p>
              {detail ? <p className="item-detail">{detail}</p> : null}
              {line.barcode ? <p className="item-detail num">{line.barcode}</p> : null}
              <div className="item-math num">
                <span>{pricing}</span>
                <span className="amount">{money(invoice ? amounts.base : amounts.total)}</span>
              </div>
            </div>
          </div>
        )
      })}
      <p className="count num">
        {units} {td('sales.unitsIn', 'units in')} {lines.length}{' '}
        {lines.length === 1 ? td('sales.lineOne', 'line') : td('sales.lineMany', 'lines')}
      </p>

      <div className="totals">
        {document.discount_cents ? (
          <>
            <Line label={td('sales.subtotal', 'Subtotal')} value={money(document.base_cents + document.discount_cents)} />
            <Line
              label={`${td('sales.discount', 'Discount')}${document.discount_type === 'percent' ? ` (${document.discount_value}%)` : ''}`}
              value={`−${money(document.discount_cents)}`}
            />
          </>
        ) : null}
        {invoice ? (
          <>
            <Line
              label={document.discount_cents ? td('sales.subtotalAfterDiscount', 'Subtotal after discount') : td('sales.subtotal', 'Subtotal')}
              value={money(document.base_cents)}
            />
            <Line label="IVA" value={money(document.tax_cents)} />
            {document.recargo_cents ? (
              <Line label={`${td('sales.recargo', 'Recargo de equivalencia')} (${document.recargo_percent}%)`} value={money(document.recargo_cents)} />
            ) : null}
          </>
        ) : null}
        <div className="grand num">
          <span>{invoice ? td('sales.total', 'Total') : td('sales.totalNet', 'Total (net)')}</span>
          <span>{money(document.total_cents)}</span>
        </div>
      </div>

      {groups.length > 0 ? (
        <>
          <Section>{td('sales.taxBreakdown', 'IVA summary')}</Section>
          <table className="taxes num">
            <thead>
              <tr>
                <th>{td('sales.rate', 'Rate')}</th>
                <th>{td('print.base', 'Base')}</th>
                <th>IVA</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr key={group.rate}>
                  <td>{group.rate}%</td>
                  <td>{money(group.base)}</td>
                  <td>{money(group.tax)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}

      {notes ? (
        <>
          <Section>{td('sales.notes', 'Notes')}</Section>
          <p className="notes">{notes}</p>
        </>
      ) : null}

      {!invoice && theme.show_signature ? (
        <div className="sign">
          <span>{td('printables.receivedBy', 'Received by (name and signature)')}</span>
          <span>{td('printables.signDate', 'Date')}</span>
        </div>
      ) : null}

      {terms ? (
        <>
          <div className="rule" />
          <p className="terms">{terms}</p>
        </>
      ) : null}

      {invoice && document.verify_code ? (
        <>
          <div className="rule" />
          <div className="qr">
            <QRCodeSVG value={`${PUBLIC_SITE_URL}/verify/${document.verify_code}`} size={96} level="M" marginSize={0} fgColor="#000000" bgColor="#ffffff" />
            <p className="strong">{td('print.verifyTitle', 'Verify this invoice')}</p>
            <p className="muted">{td('print.verifyBody', 'Scan the code to confirm it is genuine.')}</p>
          </div>
        </>
      ) : null}

      {!invoice ? (
        <>
          <div className="rule" />
          <p className="muted center">{td('sales.albaranFooter', 'Keep this slip with the goods.')}</p>
        </>
      ) : null}

      <p className="end num">· · · {document.number} · · ·</p>
    </div>
  )
}

function waitForImages(doc: Document): Promise<void> {
  const pending = [...doc.images].filter((image) => !image.complete)
  return Promise.all(pending.map((image) => new Promise<void>((resolve) => {
    image.addEventListener('load', () => resolve(), { once: true })
    image.addEventListener('error', () => resolve(), { once: true })
  }))).then(() => undefined)
}

/**
 * Opens the slip in its own window and brings up the print dialog. Call it straight from the click: the window has to
 * open before anything is awaited, or the browser blocks it. Returns false when it was blocked.
 */
export function printThermalSlip(
  sale: SaleDocument,
  company: Company | null,
  currency: string,
  onError: (error: unknown) => void,
): boolean {
  const target = window.open('', '_blank', 'width=420,height=760')
  if (!target) return false

  const doc = target.document
  doc.open()
  doc.write(
    `<!doctype html><html><head><meta charset="utf-8"><title></title><style>${STYLE}</style></head>` +
      `<body><div id="slip"><p style="padding:6mm 4mm;font-family:Arial,sans-serif"></p></div></body></html>`,
  )
  doc.close()
  // Data goes in as text, never into the HTML string, so nothing in it can be read as markup.
  doc.title = sale.number
  const preparing = doc.querySelector('#slip p')
  if (preparing) preparing.textContent = t('print.slipPreparing', 'Preparing the slip…')

  void (async () => {
    const payload = await getPrintTemplates()
    const theme = pickPrintTemplate(payload.templates, sale.type)
    const logoSrc =
      sale.type === 'factura' && theme.show_logo
        ? await loadLogoBlob(payload.logo_url ?? company?.logo_url ?? null).catch(() => null) // no logo file: print without it
        : null

    const host = doc.getElementById('slip')
    if (!host || target.closed) return
    host.replaceChildren()
    const root = createRoot(host)
    flushSync(() => {
      root.render(<ThermalSlip document={sale} company={company} currency={currency} theme={theme} logoSrc={logoSrc} />)
    })
    await waitForImages(doc)

    // The slip stays in its window after the dialog, so it can be printed again from there.
    target.focus()
    // Give the layout a tick before the print dialog freezes rendering.
    target.setTimeout(() => target.print(), 300)
  })().catch((error) => {
    if (!target.closed) target.close()
    onError(error)
  })

  return true
}
