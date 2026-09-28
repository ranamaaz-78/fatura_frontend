import { Search } from 'lucide-react'
import { useEffect, useId, useState, type KeyboardEvent, type ReactNode } from 'react'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'

export type SearchResult = {
  id: string
  label: ReactNode
}

export type SearchInputProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  results?: SearchResult[]
  onSelect?: (id: string) => void
  className?: string
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  results,
  onSelect,
  className,
}: SearchInputProps) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const hasResults = Boolean(results && results.length > 0)

  useEffect(() => {
    setActiveIndex(0)
  }, [results])

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!hasResults || !results) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((current) => (current + 1) % results.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((current) => (current - 1 + results.length) % results.length)
    } else if (event.key === 'Enter' && open) {
      event.preventDefault()
      const item = results[activeIndex]
      if (item) onSelect?.(item.id)
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className={cn('relative flex-1 max-w-md', className)}>
      <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-muted" />
      <input
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120)
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? t('common.search', 'Search')}
        role="combobox"
        aria-expanded={open && hasResults}
        aria-controls={listId}
        className="w-full rounded-xl border border-line bg-card py-2 pr-3 pl-9 text-sm text-ink transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none"
      />
      {open && hasResults && results ? (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1.5 bg-card border border-line rounded-2xl shadow-2xl z-30 overflow-hidden divide-y divide-line max-h-80 overflow-y-auto"
        >
          {results.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className={cn(
                'w-full text-left px-4 py-2.5 text-sm text-ink',
                index === activeIndex ? 'bg-brand-50/60' : 'hover:bg-page',
              )}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect?.(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
