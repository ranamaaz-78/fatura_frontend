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
  if (result.logo_url) {
    releaseImageBlob(result.logo_url)
    trimmedLogos.delete(result.logo_url)
  }
  return result
}

export async function deleteCompanyLogo(): Promise<{ logo_url: string | null }> {
  releaseImageBlob('/app/company/logo')
  trimmedLogos.delete('/app/company/logo')
  return unwrap<{ logo_url: string | null }>(api.delete('/app/company/logo'))
}

const trimmedLogos = new Map<string, Promise<string>>()

/**
 * The company logo, ready for a printed sheet: the empty transparent (or plain white) margin that
 * many logo files carry is cut away, so the mark fills the space it is given instead of floating
 * small in the middle of it. A photo-like logo with its own coloured ground is left as it is.
 */
export function loadLogoBlob(logoUrl: string | null): Promise<string | null> {
  if (!logoUrl) return Promise.resolve(null)

  let pending = trimmedLogos.get(logoUrl)
  if (!pending) {
    pending = loadImageBlob(logoUrl).then((src) => trimLogoMargins(src).catch(() => src))
    trimmedLogos.set(logoUrl, pending)
    pending.catch(() => trimmedLogos.delete(logoUrl))
  }
  return pending
}

export async function trimLogoMargins(src: string): Promise<string> {
  const img = new Image()
  img.src = src
  await img.decode()

  const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight, 1))
  const width = Math.max(1, Math.round(img.naturalWidth * scale))
  const height = Math.max(1, Math.round(img.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return src
  context.drawImage(img, 0, 0, width, height)
  const { data } = context.getImageData(0, 0, width, height)

  const alpha = (x: number, y: number) => data[(y * width + x) * 4 + 3]
  const white = (x: number, y: number) => {
    const at = (y * width + x) * 4
    return data[at + 3] > 240 && data[at] > 245 && data[at + 1] > 245 && data[at + 2] > 245
  }
  const corners: Array<[number, number]> = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ]

  // Decide what "empty" means from the corners; anything else is a picture, left alone.
  let empty: (x: number, y: number) => boolean
  if (corners.every(([x, y]) => alpha(x, y) < 16)) empty = (x, y) => alpha(x, y) < 16
  else if (corners.every(([x, y]) => white(x, y))) empty = (x, y) => alpha(x, y) < 16 || white(x, y)
  else return src

  let left = width
  let top = height
  let right = -1
  let bottom = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (empty(x, y)) continue
      if (x < left) left = x
      if (x > right) right = x
      if (y < top) top = y
      if (y > bottom) bottom = y
    }
  }
  if (right < 0) return src

  // A hair of breathing room so nothing touches the edge.
  const pad = Math.round(Math.max(right - left, bottom - top) * 0.02)
  left = Math.max(0, left - pad)
  top = Math.max(0, top - pad)
  right = Math.min(width - 1, right + pad)
  bottom = Math.min(height - 1, bottom + pad)

  const cropWidth = right - left + 1
  const cropHeight = bottom - top + 1
  if (cropWidth >= width * 0.97 && cropHeight >= height * 0.97) return src

  const out = document.createElement('canvas')
  out.width = cropWidth
  out.height = cropHeight
  out.getContext('2d')?.drawImage(canvas, left, top, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight)
  return out.toDataURL('image/png')
}
