import { toBlob, toJpeg } from 'html-to-image'
import { jsPDF } from 'jspdf'

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
  return new Error('Could not render the document.')
}

export async function captureSheetPngBlob(node: HTMLElement): Promise<Blob> {
  await waitForSheetAssets(node)
  try {
    const blob = await Promise.race([
      toBlob(node, captureOptions),
      withTimeout(12000).then(() => null),
    ])
    if (!blob) throw new Error('Could not render the document.')
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
    throw new Error('The document sheet is not on the page.')
  }
  return target
}

function triggerBlobDownload(filename: string, blob: Blob): void {
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

export async function downloadSheetImage(filename: string, node?: HTMLElement | null): Promise<void> {
  const blob = await captureSheetPngBlob(sheetNode(node))
  triggerBlobDownload(filename, blob)
}

export async function downloadSheetPdf(filename: string, node?: HTMLElement | null): Promise<void> {
  const blob = await captureSheetPngBlob(sheetNode(node))
  const dataUrl = await blobToDataUrl(blob)
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  pdf.addImage(dataUrl, 'PNG', 0, 0, 210, 297)
  pdf.save(filename)
}

export async function generateSheetPdfBase64(node?: HTMLElement | null): Promise<string> {
  const target = sheetNode(node)
  await waitForSheetAssets(target)
  const jpegDataUrl = await Promise.race([
    toJpeg(target, { ...captureOptions, quality: 0.88 }),
    withTimeout(12000).then(() => null),
  ])
  if (!jpegDataUrl) throw new Error('Could not render the document for WhatsApp.')
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
  pdf.addImage(jpegDataUrl, 'JPEG', 0, 0, 210, 297, undefined, 'FAST')
  return pdf.output('datauristring')
}
