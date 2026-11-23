import { t } from '../../i18n'
import type { IssuableType, SaleType } from '../../types/sales'

export type DocumentRules = {
  /** What the sheet prints across the top, and what the lists are called. */
  title: string
  /** Quotations promise nothing, so they never move stock. */
  movesStock: boolean
  carriesTax: boolean
  /** Recargo de equivalencia can be added to an invoice or a quotation, and to nothing else. */
  allowsRecargo: boolean
  carriesDiscount: boolean
  /** A proforma loads the catalog price like any document, but the price is meant to be edited to the agreed one. */
  manualPrice: boolean
  /** Only the documents that ask for money settle a payment. */
  settlesPayment: boolean
  /** A proforma is settled piece by piece, not by marking the whole document paid. */
  settlesLines: boolean
  /** An albarán is a hand-over note, so the company contact lines stay off it. */
  showsCompanyContact: boolean
  /** A quotation prints the price with and without tax. */
  showsPriceWithTax: boolean
  /** A quotation does not reserve stock, so the available column stays off it. */
  showsAvailable: boolean
  /** The list this kind of document belongs to. */
  listPath: string
  /** Where "New" opens: the counter (POS) with this kind picked, or the kind's own screen. */
  newPath: string
  /** A delivery receipt names no client: no client box on its screen, and only "Client" on the sheet. */
  hasClient: boolean
}

const RULES: Record<SaleType, DocumentRules> = {
  factura: {
    title: t('nav.invoice', 'Invoice'),
    allowsRecargo: true,
    movesStock: true,
    carriesTax: true,
    carriesDiscount: true,
    manualPrice: false,
    settlesPayment: true,
    settlesLines: false,
    showsCompanyContact: true,
    showsPriceWithTax: false,
    showsAvailable: true,
    listPath: '/app/invoices',
    newPath: '/app/invoices/new?type=factura',
    hasClient: true,
  },
  albaran: {
    title: t('sales.typeAlbaran', 'Delivery note'),
    allowsRecargo: false,
    movesStock: true,
    carriesTax: false,
    carriesDiscount: true,
    manualPrice: false,
    settlesPayment: true,
    settlesLines: false,
    showsCompanyContact: false,
    showsPriceWithTax: false,
    showsAvailable: true,
    listPath: '/app/delivery-notes',
    newPath: '/app/invoices/new?type=albaran',
    hasClient: true,
  },
  quotation: {
    title: t('sales.typeQuotation', 'Quotation'),
    allowsRecargo: true,
    movesStock: false,
    carriesTax: true,
    carriesDiscount: true,
    manualPrice: false,
    settlesPayment: false,
    settlesLines: false,
    showsCompanyContact: true,
    showsPriceWithTax: true,
    showsAvailable: false,
    listPath: '/app/quotes',
    newPath: '/app/invoices/new?type=quotation',
    hasClient: true,
  },
  proforma: {
    title: t('sales.typeProforma', 'Proforma'),
    allowsRecargo: false,
    movesStock: true,
    carriesTax: false,
    carriesDiscount: false,
    manualPrice: true,
    settlesPayment: false,
    settlesLines: true,
    showsCompanyContact: true,
    showsPriceWithTax: false,
    showsAvailable: true,
    listPath: '/app/proformas',
    newPath: '/app/invoices/new?type=proforma',
    hasClient: true,
  },
  // Like a delivery note, a delivery receipt shows prices and a total only: no IVA, recargo or discount.
  nota_entrega: {
    title: t('sales.typeNotaEntrega', 'Delivery receipt'),
    allowsRecargo: false,
    movesStock: true,
    carriesTax: false,
    carriesDiscount: false,
    manualPrice: false,
    settlesPayment: false,
    settlesLines: false,
    // No company details and no logo on it, like the delivery note.
    showsCompanyContact: false,
    showsPriceWithTax: false,
    showsAvailable: true,
    listPath: '/app/delivery-receipts',
    newPath: '/app/delivery-receipts/new',
    hasClient: false,
  },
  abono: {
    title: t('sales.typeAbono', 'Abono'),
    allowsRecargo: false,
    movesStock: true,
    carriesTax: true,
    carriesDiscount: true,
    manualPrice: false,
    settlesPayment: true,
    settlesLines: false,
    showsCompanyContact: true,
    showsPriceWithTax: false,
    showsAvailable: true,
    listPath: '/app/invoices',
    newPath: '/app/invoices/new?type=factura',
    hasClient: true,
  },
}

/** The kinds the counter (POS) can switch between. The delivery receipt has its own screen and is not one of them. */
export const ISSUABLE_TYPES: IssuableType[] = ['factura', 'albaran', 'quotation', 'proforma']

/** Every kind a person can issue, the delivery receipt included (lists, the bin, permissions). */
export const DOCUMENT_TYPES: IssuableType[] = [...ISSUABLE_TYPES, 'nota_entrega']

export function rulesFor(type: SaleType): DocumentRules {
  return RULES[type] ?? RULES.factura
}

export function typeLabel(type: SaleType): string {
  switch (type) {
    case 'factura':
      return t('sales.typeFactura', 'Invoice')
    case 'albaran':
      return t('sales.typeAlbaran', 'Delivery note')
    case 'quotation':
      return t('sales.typeQuotation', 'Quotation')
    case 'proforma':
      return t('sales.typeProforma', 'Proforma')
    case 'nota_entrega':
      return t('sales.typeNotaEntrega', 'Delivery receipt')
    default:
      return t('sales.typeAbono', 'Abono')
  }
}

export function isIssuable(value: string | null): value is IssuableType {
  return value !== null && (ISSUABLE_TYPES as string[]).includes(value)
}

/** Invoice, delivery note, and proforma celebrate when a payment is just recorded. */
export function celebratesPayment(type: SaleType): boolean {
  return type === 'factura' || type === 'albaran' || type === 'proforma'
}

/** Only a paid invoice or delivery note can be voided. */
export function canVoidType(type: SaleType): boolean {
  return type === 'factura' || type === 'albaran'
}

/** An abono returns goods; everything else that moves stock takes it out. */
export function stockDirection(type: SaleType): number {
  if (!rulesFor(type).movesStock) return 0
  return type === 'abono' ? 1 : -1
}
