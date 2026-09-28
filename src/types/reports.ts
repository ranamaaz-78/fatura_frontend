import type { PaymentPeriod } from './sales'

export type ReportKind =
  | 'sales'
  | 'tax'
  | 'products'
  | 'outstanding'
  | 'payments'
  | 'stock'
  | 'clients'
  | 'suppliers'

export type ReportKpis = Record<string, number>

export type ReportSeriesPoint = {
  day: string
  document_count: number
  total_cents: number
}

export type ReportBreakdownRow = {
  key: string
  label?: string
  count: number
  total_cents: number
  paid_count?: number
  open_count?: number
}

export type ReportStatusRow = {
  key: string
  count: number
  total_cents: number
}

export type ReportRow = Record<string, string | number | boolean | null>

export type ReportPayload = {
  kind: ReportKind
  kpis: ReportKpis
  series?: ReportSeriesPoint[]
  breakdown?: ReportBreakdownRow[]
  status?: ReportStatusRow[]
  rows?: ReportRow[]
}

export type ReportParams = {
  period?: PaymentPeriod
  from?: string
  to?: string
}

export const REPORT_KINDS: ReportKind[] = [
  'sales',
  'tax',
  'products',
  'outstanding',
  'payments',
  'stock',
  'clients',
  'suppliers',
]

export const SNAPSHOT_KINDS: ReportKind[] = ['stock', 'suppliers']
