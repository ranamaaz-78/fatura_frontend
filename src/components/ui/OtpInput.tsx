import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from 'react'
import { cn } from '../../lib/cn'

type OtpInputProps = {
  value: string
  onChange: (value: string) => void
  length?: number
  error?: boolean
  disabled?: boolean
  autoFocus?: boolean
  /** Id of the element that describes the field (hint or error text). */
  describedBy?: string
  'aria-label'?: string
}

const digitsOnly = (value: string) => value.replace(/[^0-9]/g, '')

/** One box per digit. Typing moves ahead, backspace moves back, and a pasted code fills them all. */
export function OtpInput({
  value,
  onChange,
  length = 6,
  error = false,
  disabled = false,
  autoFocus = false,
  describedBy,
  'aria-label': ariaLabel = 'Verification code',
}: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([])
  const digits = Array.from({ length }, (_, index) => value[index] ?? '')

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus()
  }, [autoFocus])

  function focusAt(index: number) {
    const target = refs.current[Math.min(Math.max(index, 0), length - 1)]
    target?.focus()
    target?.select()
  }

  /** Puts `typed` into the boxes from `index` onward and moves to the next empty one. */
  function fill(index: number, typed: string) {
    const clean = digitsOnly(typed)
    if (clean === '') return
    const next = digits.slice()
    let cursor = index
    for (const digit of clean) {
      if (cursor >= length) break
      next[cursor] = digit
      cursor += 1
    }
    onChange(next.join('').slice(0, length))
    focusAt(cursor)
  }

  function onKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace') {
      event.preventDefault()
      if (digits[index] !== '') {
        const next = digits.slice()
        next[index] = ''
        onChange(next.join(''))
      } else if (index > 0) {
        const next = digits.slice()
        next[index - 1] = ''
        onChange(next.join(''))
        focusAt(index - 1)
      }
    } else if (event.key === 'Delete') {
      event.preventDefault()
      const next = digits.slice()
      next[index] = ''
      onChange(next.join(''))
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      focusAt(index - 1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      focusAt(index + 1)
    }
  }

  function onPaste(index: number, event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault()
    // A full pasted code always starts from the first box.
    const pasted = event.clipboardData.getData('text')
    fill(digitsOnly(pasted).length >= length ? 0 : index, pasted)
  }

  return (
    <div role="group" aria-label={ariaLabel} className="flex items-center justify-between gap-2 sm:gap-3">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(node) => {
            refs.current[index] = node
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={index === 0 ? length : 1}
          value={digit}
          disabled={disabled}
          aria-label={`${ariaLabel}, digit ${index + 1} of ${length}`}
          aria-invalid={error || undefined}
          aria-describedby={describedBy}
          onFocus={(event) => event.target.select()}
          onChange={(event) => fill(index, event.target.value)}
          onKeyDown={(event) => onKeyDown(index, event)}
          onPaste={(event) => onPaste(index, event)}
          className={cn(
            'h-14 w-full min-w-0 max-w-14 rounded-xl border bg-white text-center font-mono text-2xl font-bold text-[#0b1c30] outline-none transition',
            'focus:border-[#004ac6] focus:ring-4 focus:ring-[#004ac6]/12 sm:h-16 sm:text-[28px]',
            digit !== '' && !error && 'border-[#004ac6]/40 bg-[#f5f8ff]',
            error ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/15' : 'border-[#dbe1ff]',
            disabled && 'cursor-not-allowed opacity-60',
          )}
        />
      ))}
    </div>
  )
}
