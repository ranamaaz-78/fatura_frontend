/**
 * Names of the files people download, always in the same order so a folder of them reads clearly:
 *   Company name - what it is - date.ext
 *   Cafe Luna - Invoice F-202610-00002 - 2026-10-19.pdf
 */

/** A slash or colon becomes a dash; other characters a file name cannot hold are dropped; runs of blanks collapse. */
function clean(part: string): string {
  return part
    .replace(/[\/:]+/g, '-')
    .replace(/["*?<>|]+/g, '')
    .replace(/[\u0000-\u001f]+/g, '')
    .replace(/\s+/g, ' ')
    .replace(/-{2,}/g, '-')
    .trim()
    .replace(/^[-. ]+|[-. ]+$/g, '')
}

/** The date as yyyy-mm-dd in the person's own day, so files sort by date in a folder. */
export function fileDate(value: string | number | Date = new Date()): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return fileDate(new Date())

  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** "Company - what it is - date" and the extension (none when `ext` is empty). Empty parts are left out. */
export function downloadFileName(parts: (string | null | undefined)[], ext: string): string {
  const name = parts
    .map((part) => clean(part ?? ''))
    .filter((part) => part !== '')
    .join(' - ')
    .slice(0, 150)
    .trim()

  const base = name === '' ? 'download' : name
  return ext === '' ? base : `${base}.${ext}`
}
