import {
  Children,
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ChangeEventHandler,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Search } from 'lucide-react'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'

export type SearchableSelectOption = {
  value: string
  label: string
  disabled?: boolean
  /** Extra words the search box matches on, not shown. */
  keywords?: string
  /** Shorter text for the closed control, when the list row is longer. */
  triggerLabel?: string
}

export type SearchableSelectTone = 'app' | 'public'

export type SearchableSelectProps = {
  options: SearchableSelectOption[]
  value?: string | number
  defaultValue?: string | number
  onChange?: ChangeEventHandler<HTMLSelectElement>
  onBlur?: ChangeEventHandler<HTMLSelectElement>
  name?: string
  id?: string
  disabled?: boolean
  required?: boolean
  compact?: boolean
  error?: boolean
  tone?: SearchableSelectTone
  className?: string
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
}

function optionText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(optionText).join('')
  return ''
}

export function optionsFromChildren(children: ReactNode): SearchableSelectOption[] {
  const options: SearchableSelectOption[] = []

  Children.toArray(children).forEach((child) => {
    if (!isValidElement<{ value?: string | number; disabled?: boolean; children?: ReactNode }>(child)) return
    if (child.type !== 'option') return

    const label = optionText(child.props.children)
    const value = child.props.value === undefined ? label : String(child.props.value)
    options.push({ value, label, disabled: Boolean(child.props.disabled) })
  })

  return options
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function mergeRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return (node: T | null) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') ref(node)
      else if (ref) (ref as { current: T | null }).current = node
    })
  }
}

function emitChange(
  onChange: ChangeEventHandler<HTMLSelectElement> | undefined,
  select: HTMLSelectElement | null,
  value: string,
  name: string,
) {
  if (!onChange) return
  const target = select ?? ({ value, name } as HTMLSelectElement)
  onChange({ target, currentTarget: target } as ChangeEvent<HTMLSelectElement>)
}

export const SearchableSelect = forwardRef<HTMLSelectElement, SearchableSelectProps>(
  function SearchableSelect(
    {
      options,
      value,
      defaultValue,
      onChange,
      onBlur,
      name,
      id,
      disabled = false,
      required = false,
      compact = false,
      error = false,
      tone = 'app',
      className,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      'aria-describedby': ariaDescribedBy,
    },
    forwardedRef,
  ) {
    const generatedId = useId()
    const selectId = id ?? generatedId
    const listId = `${selectId}-list`
    const searchId = `${selectId}-search`
    const isControlled = value !== undefined
    const [internal, setInternal] = useState(() => (defaultValue === undefined ? '' : String(defaultValue)))
    const current = isControlled ? String(value) : internal
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [active, setActive] = useState(0)
    const [panel, setPanel] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null)

    const triggerRef = useRef<HTMLButtonElement>(null)
    const hiddenRef = useRef<HTMLSelectElement>(null)
    const searchRef = useRef<HTMLInputElement>(null)
    const listRef = useRef<HTMLUListElement>(null)

    const selected = options.find((option) => option.value === current)
    const filtered = useMemo(() => {
      const needle = normalize(query.trim())
      if (needle === '') return options
      return options.filter(
        (option) =>
          normalize(option.label).includes(needle) ||
          normalize(option.value).includes(needle) ||
          normalize(option.keywords ?? '').includes(needle),
      )
    }, [options, query])

    const enabled = filtered.filter((option) => !option.disabled)

    const place = useCallback(() => {
      const trigger = triggerRef.current
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      const width = Math.min(Math.max(rect.width, 220), window.innerWidth - 16)
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8)
      const spaceBelow = window.innerHeight - rect.bottom - 8
      const spaceAbove = rect.top - 8
      const openUp = spaceBelow < 200 && spaceAbove > spaceBelow
      const maxHeight = Math.min(280, openUp ? spaceAbove : spaceBelow)
      setPanel({
        width,
        left,
        maxHeight: Math.max(140, maxHeight),
        top: openUp ? rect.top - 6 - Math.max(140, maxHeight) : rect.bottom + 6,
      })
    }, [])

    function close() {
      setOpen(false)
      setQuery('')
    }

    function pick(next: string) {
      if (!isControlled) setInternal(next)
      const node = hiddenRef.current
      if (node) node.value = next
      emitChange(onChange, node, next, name ?? '')
      close()
      triggerRef.current?.focus()
    }

    useLayoutEffect(() => {
      if (!open) return
      place()
      const selectedIndex = enabled.findIndex((option) => option.value === current)
      setActive(selectedIndex >= 0 ? selectedIndex : 0)
      const frame = window.requestAnimationFrame(() => searchRef.current?.focus())
      return () => window.cancelAnimationFrame(frame)
      // Only when the menu opens. Typing in search must not steal caret position.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, place])

    useEffect(() => {
      if (!open) return

      function onPointer(event: MouseEvent) {
        const target = event.target as Node
        if (triggerRef.current?.contains(target)) return
        if (listRef.current?.parentElement?.contains(target)) return
        close()
      }

      function onKey(event: globalThis.KeyboardEvent) {
        if (event.key !== 'Escape') return
        event.preventDefault()
        event.stopPropagation()
        close()
        triggerRef.current?.focus()
      }

      function onReposition() {
        place()
      }

      window.addEventListener('mousedown', onPointer)
      window.addEventListener('keydown', onKey, true)
      window.addEventListener('resize', onReposition)
      window.addEventListener('scroll', onReposition, true)
      return () => {
        window.removeEventListener('mousedown', onPointer)
        window.removeEventListener('keydown', onKey, true)
        window.removeEventListener('resize', onReposition)
        window.removeEventListener('scroll', onReposition, true)
      }
    }, [open, place])

    useLayoutEffect(() => {
      if (isControlled) return
      const node = hiddenRef.current
      if (node && node.value !== '' && node.value !== internal) setInternal(node.value)
    }, [isControlled, options, internal])

    useEffect(() => {
      const item = listRef.current?.querySelector('[data-active="true"]')
      item?.scrollIntoView({ block: 'nearest' })
    }, [active, filtered, open])

    function onTriggerKey(event: KeyboardEvent<HTMLButtonElement>) {
      if (disabled) return
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        setOpen(true)
      }
    }

    function onSearchKey(event: KeyboardEvent<HTMLInputElement>) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActive((index) => Math.min(index + 1, Math.max(enabled.length - 1, 0)))
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActive((index) => Math.max(index - 1, 0))
      } else if (event.key === 'Enter') {
        event.preventDefault()
        const option = enabled[active]
        if (option) pick(option.value)
      } else if (event.key === 'Tab') {
        close()
      }
    }

    const publicTone = tone === 'public'

    return (
      <>
        <select
          name={name}
          ref={mergeRefs(forwardedRef, hiddenRef)}
          tabIndex={-1}
          aria-hidden="true"
          required={required}
          disabled={disabled}
          {...(isControlled
            ? { value: current }
            : { defaultValue: defaultValue === undefined ? undefined : String(defaultValue) })}
          onChange={(event) => {
            if (!isControlled) setInternal(event.target.value)
            onChange?.(event)
          }}
          onBlur={onBlur}
          className="sr-only"
        >
          {options.map((option, index) => (
            <option key={`${option.value}-${index}`} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          ref={triggerRef}
          id={selectId}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-describedby={ariaDescribedBy}
          aria-invalid={error || undefined}
          onClick={() => {
            if (disabled) return
            setOpen((was) => !was)
          }}
          onKeyDown={onTriggerKey}
          className={cn(
            'flex w-full cursor-pointer items-center justify-between gap-2 text-left transition',
            publicTone
              ? 'h-12 rounded-xl border border-[#dbe1ff] bg-white px-3 text-[15px] text-[#0b1c30] outline-none focus:border-[#004ac6] focus:ring-4 focus:ring-[#004ac6]/12'
              : cn(
                  'rounded-xl border border-line bg-card text-ink',
                  compact ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2.5 text-sm',
                  'focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500',
                ),
            disabled && 'cursor-not-allowed bg-page text-ink-muted',
            error &&
              (publicTone
                ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/15'
                : 'border-rose-300 focus:ring-rose-500/30 focus:border-rose-500'),
            className,
          )}
        >
          <span className={cn('min-w-0 flex-1 truncate', !selected && 'text-ink-muted')}>
            {selected?.triggerLabel || selected?.label || t('common.select', 'Select')}
          </span>
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-ink-muted transition', open && 'rotate-180')} />
        </button>
        {open && panel
          ? createPortal(
              <div
                style={{
                  position: 'fixed',
                  top: panel.top,
                  left: panel.left,
                  width: panel.width,
                  maxHeight: panel.maxHeight,
                  zIndex: 70,
                }}
                className={cn(
                  'flex flex-col overflow-hidden rounded-xl border bg-card shadow-lg',
                  publicTone ? 'border-[#dbe1ff]' : 'border-line',
                )}
              >
                <div className={cn('border-b p-1.5', publicTone ? 'border-[#eef2ff]' : 'border-line')}>
                  <span className="relative block">
                    <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
                    <input
                      ref={searchRef}
                      id={searchId}
                      type="search"
                      value={query}
                      autoComplete="off"
                      aria-autocomplete="list"
                      aria-controls={listId}
                      placeholder={t('common.search', 'Search')}
                      onChange={(event) => {
                        setQuery(event.target.value)
                        setActive(0)
                      }}
                      onKeyDown={onSearchKey}
                      className={cn(
                        'w-full rounded-lg border bg-card py-1.5 pr-2 pl-8 text-xs outline-none',
                        publicTone
                          ? 'border-[#dbe1ff] text-[#0b1c30] focus:border-[#004ac6] focus:ring-2 focus:ring-[#004ac6]/12'
                          : 'border-line text-ink focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
                      )}
                    />
                  </span>
                </div>
                <ul
                  ref={listRef}
                  id={listId}
                  role="listbox"
                  className="min-h-0 flex-1 overflow-y-auto py-1"
                >
                  {filtered.length === 0 ? (
                    <li className="px-3 py-2 text-xs text-ink-muted">{t('common.noResults', 'No results')}</li>
                  ) : (
                    filtered.map((option, index) => {
                      const enabledIndex = enabled.indexOf(option)
                      const isActive = enabledIndex === active
                      const isSelected = option.value === current
                      return (
                        <li key={`${option.value}-${index}`} role="presentation">
                          <button
                            type="button"
                            role="option"
                            data-active={isActive ? 'true' : undefined}
                            aria-selected={isSelected}
                            disabled={option.disabled}
                            onMouseEnter={() => {
                              if (!option.disabled && enabledIndex >= 0) setActive(enabledIndex)
                            }}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => pick(option.value)}
                            className={cn(
                              'flex w-full cursor-pointer px-3 py-1.5 text-left text-xs',
                              publicTone ? 'text-[14px] text-[#0b1c30]' : 'text-ink',
                              isActive && (publicTone ? 'bg-[#eff4ff] text-[#004ac6]' : 'bg-brand-50 text-brand-600'),
                              isSelected && 'font-semibold',
                              option.disabled && 'cursor-not-allowed text-ink-muted',
                            )}
                          >
                            <span className="truncate">{option.label}</span>
                          </button>
                        </li>
                      )
                    })
                  )}
                </ul>
              </div>,
              document.body,
            )
          : null}
      </>
    )
  },
)
