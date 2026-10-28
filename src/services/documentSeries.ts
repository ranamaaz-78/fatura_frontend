import type { IssuableType } from '../types/sales'
import { api, unwrap } from './api'

/** How one kind of document is numbered: the letters in front and the number each month starts from. */
export type DocumentSeries = {
  kind: IssuableType
  prefix: string
  /** Where every month begins. */
  start: number
  /** Where this month begins (the same as start unless the owner gave this month a number of its own). */
  first: number
  default_prefix: string
  /** How many of this kind went out this month. */
  issued_this_month: number
  /** The number the next one gets, e.g. ACME-202610/00341. */
  next_number: string
}

export type DocumentSeriesInput = Record<IssuableType, { prefix: string; start: number; first: number }>

export function getDocumentSeries(): Promise<{ series: DocumentSeries[] }> {
  return unwrap<{ series: DocumentSeries[] }>(api.get('/app/document-series'))
}

export function saveDocumentSeries(series: DocumentSeriesInput): Promise<{ series: DocumentSeries[] }> {
  return unwrap<{ series: DocumentSeries[] }>(api.put('/app/document-series', { series }))
}
