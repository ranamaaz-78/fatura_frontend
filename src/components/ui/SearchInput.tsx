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
      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
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
        className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
      />
      {open && hasResults && results ? (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl z-30 overflow-hidden divide-y divide-slate-100 max-h-80 overflow-y-auto"
        >
          {results.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className={cn(
                'w-full text-left px-4 py-2.5 text-sm text-slate-700',
                index === activeIndex ? 'bg-blue-50/60' : 'hover:bg-slate-50',
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
