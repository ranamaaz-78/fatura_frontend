import type { ReportKind, ReportParams, ReportPayload } from '../types/reports'
import { api, unwrap } from './api'

export function getReport(kind: ReportKind, params: ReportParams = {}): Promise<ReportPayload> {
  return unwrap<ReportPayload>(api.get(`/app/reports/${kind}`, { params }))
}
