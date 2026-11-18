import { useEffect, useState } from 'react'

/**
 * The quantity of a sale line: type a number, or use the + and − buttons next to it. A number typed above what is in
 * stock becomes the stock (`max`); an empty box while typing is fine and goes back to the last good number on leaving.
 */
export function QuantityField({
  value,
  max,
  onChange,
  label,
  className,
}: {
  value: number
  /** The most that can be sold (the stock), or null when there is no limit. */
  max: number | null
  onChange: (next: number) => void
  label: string
  className?: string
}) {
  const [draft, setDraft] = useState(String(value))

  // The buttons (and the stock limit) change the number from outside: the box follows.
  useEffect(() => {
    setDraft(String(value))
  }, [value])

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      aria-label={label}
      value={draft}
      onFocus={(event) => event.target.select()}
      onChange={(event) => {
        const digits = event.target.value.replace(/\D/g, '').slice(0, 6)
        if (digits === '') {
          setDraft('')
          return
        }

        let next = Number(digits)
        if (next < 1) {
          setDraft(digits)
          return
        }
        if (max !== null && next > max) next = max

        setDraft(String(next))
        onChange(next)
      }}
      onBlur={() => setDraft(String(value))}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.currentTarget.blur()
        } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          // Up and down step the number by one, like the + and − buttons (never below 1, never above the stock).
          event.preventDefault()
          const base = Number(draft) >= 1 ? Number(draft) : value
          let next = event.key === 'ArrowUp' ? base + 1 : base - 1
          if (max !== null && next > max) next = max
          if (next < 1) next = 1
          setDraft(String(next))
          if (next !== value) onChange(next)
        }
      }}
      className={className}
    />
  )
}
