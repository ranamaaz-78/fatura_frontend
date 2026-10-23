import type { ReportKind, ReportParams, ReportPayload } from '../types/reports'
import { api, unwrap } from './api'

export function getReport(kind: ReportKind, params: ReportParams = {}): Promise<ReportPayload> {
  return unwrap<ReportPayload>(api.get(`/app/reports/${kind}`, { params }))
}

export type ReportDocument = {
  id: number
  type: string
  number: string
  issued_at: string | null
  client_name: string | null
  total_cents: number
  voided: boolean
}

export type ReportDocumentList = {
  items: ReportDocument[]
  total: number
  truncated: boolean
  sum_cents: number
}

export type ReportDocumentParams = {
  type: 'factura' | 'proforma' | 'albaran'
  from: string
  to: string
  include_voided?: boolean
}

/** The documents of one kind issued between two dates (for the bulk PDF download). */
export function listReportDocuments(params: ReportDocumentParams): Promise<ReportDocumentList> {
  return unwrap<ReportDocumentList>(
    api.get('/app/reports/documents', { params: { ...params, include_voided: params.include_voided ? 1 : 0 } }),
  )
}
