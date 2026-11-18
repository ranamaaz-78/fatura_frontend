import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { Button } from './Button'
import { PageSizeSelect, type PageSize } from './PageSizeSelect'

export type PaginationProps = {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  summary?: string
  /** The page size chooser (10 · 50 · 100 · All): shown when both are given. */
  pageSize?: PageSize
  onPageSizeChange?: (size: PageSize) => void
}

export function Pagination({ page, pageCount, onPageChange, summary, pageSize, onPageSizeChange }: PaginationProps) {
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs text-ink-muted">
      <p>{summary}</p>
      {pageSize !== undefined && onPageSizeChange ? <PageSizeSelect value={pageSize} onChange={onPageSizeChange} /> : null}
      <div className={cn('flex items-center gap-1', pageCount <= 1 && 'hidden')}>
        <Button
          variant="ghost"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          {t('common.previous', 'Previous')}
        </Button>
        {pages.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            className={cn(
              'min-w-8 h-8 rounded-lg text-xs font-semibold transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-1',
              item === page ? 'bg-brand-50 text-brand-600' : 'text-ink-muted hover:bg-page',
            )}
          >
            {item}
          </button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          {t('common.next', 'Next')}
        </Button>
      </div>
    </div>
  )
}
