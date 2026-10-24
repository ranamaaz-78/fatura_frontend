import { FileCheck2, FileMinus2, FileText, Receipt, Truck, type LucideIcon } from 'lucide-react'
import type { SaleType } from '../../types/sales'

export type DocIdentity = {
  icon: LucideIcon
  /** Icon chip and badge. */
  chip: string
  /** The coloured edge on lists, headers and the paper. */
  accent: string
  /** A CSS colour for glows and charts. */
  color: string
}

/** Each kind of document has its own colour and icon across the app, so you can tell them apart at a glance. */
const IDENTITY: Record<SaleType, DocIdentity> = {
  factura: { icon: Receipt, chip: 'bg-brand-600/12 text-brand-600', accent: 'bg-brand-600', color: 'var(--app-primary)' },
  albaran: { icon: Truck, chip: 'bg-teal-500/14 text-teal-600 app-dark:text-teal-300', accent: 'bg-teal-500', color: '#14b8a6' },
  quotation: { icon: FileText, chip: 'bg-violet-500/14 text-violet-600 app-dark:text-violet-300', accent: 'bg-violet-500', color: '#8b5cf6' },
  proforma: { icon: FileCheck2, chip: 'bg-amber-500/16 text-amber-600 app-dark:text-amber-300', accent: 'bg-amber-500', color: '#f59e0b' },
  abono: { icon: FileMinus2, chip: 'bg-rose-500/14 text-rose-600 app-dark:text-rose-300', accent: 'bg-rose-500', color: '#f43f5e' },
}

export function identityFor(type: string): DocIdentity {
  return IDENTITY[type as SaleType] ?? IDENTITY.factura
}
