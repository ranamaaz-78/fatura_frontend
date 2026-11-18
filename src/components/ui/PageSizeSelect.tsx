import { useCallback, useState } from 'react'
import { t } from '../../i18n'

/** How many rows a list shows at once. "All" asks for the most the server gives in one go (see ALL_ROWS). */
export type PageSize = 10 | 50 | 100 | 'all'

export const PAGE_SIZES: PageSize[] = [10, 50, 100, 'all']

/** What "All" means to the server: every row up to this many (a list longer than this shows its first pages). */
export const ALL_ROWS = 1000

export function perPageOf(size: PageSize): number {
  return size === 'all' ? ALL_ROWS : size
}

const KEY = (name: string) => `page-size:${name}`

function readSize(name: string, fallback: PageSize): PageSize {
  try {
    const saved = window.localStorage.getItem(KEY(name))
    if (saved === 'all') return 'all'
    const number = Number(saved)
    return number === 10 || number === 50 || number === 100 ? number : fallback
  } catch {
    return fallback
  }
}

/**
 * The page size of one list, remembered on this computer: change it once and the list opens with it next time.
 * `name` is the list ("products", "payments"...).
 */
export function usePageSize(name: string, fallback: PageSize = 10): [PageSize, (size: PageSize) => void] {
  const [size, setSize] = useState<PageSize>(() => readSize(name, fallback))

  const change = useCallback(
    (next: PageSize) => {
      setSize(next)
      try {
        window.localStorage.setItem(KEY(name), String(next))
      } catch {
        /* private window: it simply goes back to the default next time */
      }
    },
    [name],
  )

  return [size, change]
}

/** "Rows: 10 · 50 · 100 · All": the little chooser at the foot of a list. `ml-auto` keeps it beside the page buttons on the right, not in the middle. */
export function PageSizeSelect({ value, onChange }: { value: PageSize; onChange: (size: PageSize) => void }) {
  return (
    <label className="ml-auto inline-flex items-center gap-2 text-xs text-ink-muted">
      <span>{t('common.rows', 'Rows')}</span>
      <select
        value={String(value)}
        onChange={(event) => onChange(event.target.value === 'all' ? 'all' : (Number(event.target.value) as PageSize))}
        aria-label={t('common.rowsPerPage', 'Rows per page')}
        className="h-8 cursor-pointer rounded-[10px] border border-line bg-card px-2 text-xs font-semibold text-ink outline-none focus:border-brand-600"
      >
        {PAGE_SIZES.map((size) => (
          <option key={String(size)} value={String(size)}>
            {size === 'all' ? t('common.all', 'All') : size}
          </option>
        ))}
      </select>
    </label>
  )
}
