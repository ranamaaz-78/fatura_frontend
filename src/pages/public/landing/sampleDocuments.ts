import type { Company } from '../../../types/module01'
import type { PrintableType, PrintTemplate } from '../../../types/printables'
import type { PaymentStatus, SaleDocument, SaleLine, SaleType } from '../../../types/sales'
import { t } from '../../../i18n'

/**
 * Made-up documents for the landing page. They go through the same sheet components as a real
 * invoice, so what a visitor sees is exactly what their customers will receive.
 */

export const SAMPLE_COMPANY = {
  id: 0,
  name: 'Ferretería Alameda S.L.',
  slug: 'sample',
  email: 'hola@ferreteriaalameda.es',
  phone: '+34 912 345 678',
  whatsapp: null,
  address: 'Calle de Alcalá 145, 3º B',
  city: 'Madrid',
  country: 'Spain',
  currency: 'EUR',
  status: 'active',
  notes: null,
  created_at: '2026-01-01T00:00:00Z',
} as Company

type Row = {
  article: string
  sr: string
  qty: number
  price: number
  iva: number
  discount?: number
}

const ROWS: Row[] = [
  { article: t('sample.drill', 'Cordless drill 18 V, 2 batteries'), sr: 'DR-1802', qty: 2, price: 8900, iva: 21 },
  { article: t('sample.bits', 'Drill bit set, 25 pieces'), sr: 'BT-025', qty: 4, price: 1490, iva: 21, discount: 10 },
  { article: t('sample.gloves', 'Work gloves, size L'), sr: 'GL-210', qty: 12, price: 395, iva: 21 },
  { article: t('sample.screws', 'Wood screws 4 x 40 mm, box of 200'), sr: 'SC-440', qty: 6, price: 560, iva: 21 },
  { article: t('sample.manual', 'Technical manual (print)'), sr: 'MN-004', qty: 2, price: 1200, iva: 4 },
]

function lines(taxed: boolean, discounted: boolean): SaleLine[] {
  return ROWS.map((row, index) => {
    const discount = discounted ? (row.discount ?? 0) : 0
    const iva = taxed ? row.iva : 0
    const base = Math.round(row.qty * row.price * (1 - discount / 100))
    const tax = Math.round(base * (iva / 100))

    return {
      position: index + 1,
      product_id: null,
      sr_number: row.sr,
      article: row.article,
      description: null,
      quantity: row.qty,
      unit_price: row.price,
      discount_percent: discount,
      iva_percent: iva,
      base_cents: base,
      tax_cents: tax,
      total_cents: base + tax,
      bill_discount_cents: 0,
    }
  })
}

function sample(
  type: SaleType,
  number: string,
  options: { taxed: boolean; discounted: boolean; status: PaymentStatus; settled?: number; recargo?: number; note?: string },
): SaleDocument {
  const rows = lines(options.taxed, options.discounted)
  const base = rows.reduce((sum, line) => sum + line.base_cents, 0)
  const tax = rows.reduce((sum, line) => sum + line.tax_cents, 0)
  const recargo = options.recargo ? Math.round((base * options.recargo) / 100) : 0

  return {
    id: 0,
    type,
    number,
    issued_at: '2026-10-01T10:30:00Z',
    expires_at: type === 'quotation' ? '2026-10-08T23:59:59Z' : null,
    is_expired: false,
    payment_status: options.status,
    payment_method_id: null,
    payment_method: null,
    voided_at: null,
    void_reason: null,
    is_voided: false,
    converted_to_id: null,
    converted_at: null,
    is_converted: false,
    customer_id: null,
    client_code: 'C-0007',
    client_name: 'Marta Rivas',
    client_company: 'Taller Rivas S.L.',
    client_phone: '+34 611 22 33 44',
    client_nif: 'B87654321',
    client_nie: null,
    client_address: 'Avenida de la Industria 22, 28108 Alcobendas',
    notes: options.note ?? null,
    base_cents: base,
    tax_cents: tax,
    discount_type: null,
    discount_value: null,
    discount_cents: 0,
    recargo_percent: options.recargo ?? null,
    recargo_cents: recargo,
    total_cents: base + tax + recargo,
    settled_cents: options.settled ?? 0,
    is_partial: options.status === 'partial',
    lines: rows,
  }
}

export const SAMPLE_DOCUMENTS: Record<PrintableType, SaleDocument> = {
  factura: sample('factura', 'F-2026/0185', {
    taxed: true,
    discounted: true,
    status: 'pending',
    recargo: 5.2,
    note: t('sampleDocuments.bank_transfer_to_es91_2100_0418_4502_0005', 'Bank transfer to ES91 2100 0418 4502 0005 1332. Please quote the invoice number.'),
  }),
  quotation: sample('quotation', 'Q-2026/0042', {
    taxed: true,
    discounted: true,
    status: 'pending',
  }),
  proforma: sample('proforma', 'PF-2026/0011', {
    taxed: false,
    discounted: false,
    status: 'partial',
    settled: 30000,
  }),
  albaran: sample('albaran', 'AL-2026/0093', {
    taxed: false,
    discounted: true,
    status: 'pending',
  }),
}

export const SAMPLE_THEME: Record<PrintableType, PrintTemplate> = {
  factura: {
    type: 'factura',
    primary_color: '#004ac6',
    font_key: 'geist',
    footer_notes: 'Payment due within 30 days.',
    notes: '',
    show_logo: true,
    show_signature: false,
  },
  quotation: {
    type: 'quotation',
    primary_color: '#004ac6',
    font_key: 'geist',
    footer_notes: 'Valid for 7 days. Delivery starts once the quotation is accepted in writing.',
    notes: '',
    show_logo: true,
    show_signature: false,
  },
  proforma: {
    type: 'proforma',
    primary_color: '#004ac6',
    font_key: 'geist',
    footer_notes: 'Proforma document. Not a tax invoice and not a payment request.',
    notes: '',
    show_logo: true,
    show_signature: false,
  },
  albaran: {
    type: 'albaran',
    primary_color: '#004ac6',
    font_key: 'geist',
    footer_notes: 'This delivery note is not a tax invoice.',
    notes: '',
    show_logo: false,
    show_signature: true,
  },
}
