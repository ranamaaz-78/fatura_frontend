import type { PrintableType, PrintTemplateInput, PrintTemplatesPayload } from '../types/printables'
import { api, unwrap } from './api'
import { loadImageBlob, releaseImageBlob } from './productImages'

export function getPrintTemplates(): Promise<PrintTemplatesPayload> {
  return unwrap<PrintTemplatesPayload>(api.get('/app/print-templates'))
}

export function savePrintTemplate(type: PrintableType, input: PrintTemplateInput): Promise<PrintTemplatesPayload> {
  return unwrap<PrintTemplatesPayload>(api.put(`/app/print-templates/${type}`, input))
}

export function resetPrintTemplate(type: PrintableType): Promise<PrintTemplatesPayload> {
  return unwrap<PrintTemplatesPayload>(api.post(`/app/print-templates/${type}/reset`))
}

export function copyPrintTemplate(type: PrintableType, types: PrintableType[]): Promise<PrintTemplatesPayload> {
  return unwrap<PrintTemplatesPayload>(api.post(`/app/print-templates/${type}/copy`, { types }))
}

export async function uploadCompanyLogo(file: File): Promise<{ logo_url: string | null }> {
  const form = new FormData()
  form.append('file', file)
  const result = await unwrap<{ logo_url: string | null }>(
    api.post('/app/company/logo', form, {
      headers: { 'Content-Type': undefined },
      timeout: 60000,
    }),
  )
  if (result.logo_url) releaseImageBlob(result.logo_url)
  return result
}

export async function deleteCompanyLogo(): Promise<{ logo_url: string | null }> {
  releaseImageBlob('/app/company/logo')
  return unwrap<{ logo_url: string | null }>(api.delete('/app/company/logo'))
}

export function loadLogoBlob(logoUrl: string | null): Promise<string | null> {
  if (!logoUrl) return Promise.resolve(null)
  return loadImageBlob(logoUrl)
}
