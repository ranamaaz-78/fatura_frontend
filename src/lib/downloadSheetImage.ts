import { toBlob, toJpeg } from 'html-to-image'
import JSZip from 'jszip'
import { jsPDF } from 'jspdf'
import { t } from '../i18n'

/** On-screen A4 frame (210mm × 297mm at 96dpi). */
export const A4_CSS_WIDTH = 794
export const A4_CSS_HEIGHT = 1123

export function sheetFileName(number: string, ext = 'png'): string {
  const safe = number.replace(/[^\w.-]+/g, '-')
  return `${safe || 'document'}.${ext}`
}

function withTimeout(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

async function waitForSheetAssets(node: HTMLElement): Promise<void> {
  if (window.document.fonts?.ready) {
    await Promise.race([window.document.fonts.ready, withTimeout(2500)])
  }
  const images = [...node.querySelectorAll('img')]
  await Promise.all(
    images.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve()
      return img.decode().catch(() => undefined)
    }),
  )
}

const captureOptions = {
  cacheBust: false,
  pixelRatio: 2,
  skipFonts: true,
  width: A4_CSS_WIDTH,
  height: A4_CSS_HEIGHT,
  backgroundColor: '#ffffff',
  style: {
    margin: '0',
    transform: 'none',
    boxShadow: 'none',
    opacity: '1',
  },
}

function asError(error: unknown): Error {
  if (error instanceof Error) return error
  return new Error(t('downloadSheetImage.could_not_render_the_document', 'Could not render the document.'))
}

export async function captureSheetPngBlob(node: HTMLElement): Promise<Blob> {
  await waitForSheetAssets(node)
  try {
    const blob = await Promise.race([
      toBlob(node, captureOptions),
      withTimeout(12000).then(() => null),
    ])
    if (!blob) throw new Error(t('downloadSheetImage.could_not_render_the_document', 'Could not render the document.'))
    return blob
  } catch (error) {
    throw asError(error)
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function sheetNode(node?: HTMLElement | null): HTMLElement {
  const target = node ?? document.getElementById('printable-invoice')
  if (!target) {
    throw new Error(t('downloadSheetImage.the_document_sheet_is_not_on_the_page', 'The document sheet is not on the page.'))
  }
  return target
}

/** The A4 sheets of a rendered document: one for most documents, several for a long one. Anything else is taken as one sheet. */
export function sheetPages(node: HTMLElement): HTMLElement[] {
  const pages = [...node.querySelectorAll<HTMLElement>('.print-sheet')]
  return pages.length > 0 ? pages : [node]
}

export function triggerBlobDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = filename
  link.rel = 'noopener'
  link.href = url
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
}

/** The sheet as a PNG data URL, for putting it on a PDF page. */
export async function captureSheetDataUrl(node?: HTMLElement | null): Promise<string> {
  return blobToDataUrl(await captureSheetPngBlob(sheetPages(sheetNode(node))[0]))
}

/** Every sheet of the document as a PNG data URL, in page order. */
export async function captureSheetDataUrls(node?: HTMLElement | null): Promise<string[]> {
  const urls: string[] = []
  for (const page of sheetPages(sheetNode(node))) urls.push(await blobToDataUrl(await captureSheetPngBlob(page)))
  return urls
}

/** Up to this many sheets are saved as one tall picture; a longer document is saved as one picture per sheet in a ZIP. */
const STITCH_MAX_PAGES = 12

async function stitchPages(blobs: Blob[]): Promise<Blob> {
  const images = await Promise.all(blobs.map((blob) => createImageBitmap(blob)))
  const canvas = window.document.createElement('canvas')
  canvas.width = images[0].width
  canvas.height = images.reduce((sum, image) => sum + image.height, 0)
  const context = canvas.getContext('2d')
  if (!context) throw new Error(t('downloadSheetImage.could_not_render_the_document', 'Could not render the document.'))
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  let top = 0
  for (const image of images) {
    context.drawImage(image, 0, top)
    top += image.height
    image.close()
  }
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error(t('downloadSheetImage.could_not_render_the_document', 'Could not render the document.'))
  return blob
}

export async function downloadSheetImage(filename: string, node?: HTMLElement | null): Promise<void> {
  const target = sheetNode(node)
  await waitForSheetAssets(target)
  const blobs: Blob[] = []
  for (const page of sheetPages(target)) blobs.push(await captureSheetPngBlob(page))

  if (blobs.length === 1) return triggerBlobDownload(filename, blobs[0])
  if (blobs.length <= STITCH_MAX_PAGES) return triggerBlobDownload(filename, await stitchPages(blobs))

  const base = filename.replace(/\.png$/i, '')
  const zip = new JSZip()
  blobs.forEach((blob, index) => zip.file(base + ' - ' + (index + 1) + '.png', blob))
  triggerBlobDownload(base + '.zip', await zip.generateAsync({ type: 'blob', compression: 'STORE' }))
}

export async function downloadSheetPdf(filename: string, node?: HTMLElement | null): Promise<void> {
  const target = sheetNode(node)
  await waitForSheetAssets(target)
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
  let first = true
  for (const page of sheetPages(target)) {
    const dataUrl = await blobToDataUrl(await captureSheetPngBlob(page))
    if (!first) pdf.addPage('a4', 'portrait')
    pdf.addImage(dataUrl, 'PNG', 0, 0, 210, 297, undefined, 'FAST')
    first = false
  }
  pdf.save(filename)
}

export async function generateSheetPdfBase64(node?: HTMLElement | null): Promise<string> {
  const target = sheetNode(node)
  await waitForSheetAssets(target)
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
  let first = true
  for (const page of sheetPages(target)) {
    const jpegDataUrl = await Promise.race([
      toJpeg(page, { ...captureOptions, quality: 0.88 }),
      withTimeout(12000).then(() => null),
    ])
    if (!jpegDataUrl) throw new Error(t('downloadSheetImage.could_not_render_the_document_for_whatsapp', 'Could not render the document for WhatsApp.'))
    if (!first) pdf.addPage('a4', 'portrait')
    pdf.addImage(jpegDataUrl, 'JPEG', 0, 0, 210, 297, undefined, 'FAST')
    first = false
  }
  return pdf.output('datauristring')
}
