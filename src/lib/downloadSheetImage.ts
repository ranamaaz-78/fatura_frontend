import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'

/** On-screen A4 frame (210mm × 297mm at 96dpi). */
export const A4_CSS_WIDTH = 794
export const A4_CSS_HEIGHT = 1123

export function sheetFileName(number: string, ext = 'png'): string {
  const safe = number.replace(/[^\w.-]+/g, '-')
  return `${safe || 'document'}.${ext}`
}

export async function captureSheetPng(node: HTMLElement): Promise<string> {
  return toPng(node, {
    cacheBust: true,
    pixelRatio: 2,
    width: A4_CSS_WIDTH,
    height: A4_CSS_HEIGHT,
    backgroundColor: '#ffffff',
    style: {
      margin: '0',
      transform: 'none',
      boxShadow: 'none',
    },
  })
}

function sheetNode(node?: HTMLElement | null): HTMLElement {
  const target = node ?? document.getElementById('printable-invoice')
  if (!target) {
    throw new Error('The document sheet is not on the page.')
  }
  return target
}

function triggerDownload(filename: string, href: string): void {
  const link = document.createElement('a')
  link.download = filename
  link.href = href
  link.click()
}

export async function downloadSheetImage(filename: string, node?: HTMLElement | null): Promise<void> {
  const dataUrl = await captureSheetPng(sheetNode(node))
  triggerDownload(filename, dataUrl)
}

export async function downloadSheetPdf(filename: string, node?: HTMLElement | null): Promise<void> {
  const dataUrl = await captureSheetPng(sheetNode(node))
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  pdf.addImage(dataUrl, 'PNG', 0, 0, 210, 297)
  pdf.save(filename)
}
