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
  /** A proforma is issued at the price the user types, not the catalog one. */
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
  },
  albaran: {
    title: 'Albarán',
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
  },
}

export const ISSUABLE_TYPES: IssuableType[] = ['factura', 'albaran', 'quotation', 'proforma']

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
