import { useEffect, useState, type KeyboardEvent } from 'react'

/**
 * Moving through a list of search results with the arrow keys, the way a menu works: Down and Up change the highlighted
 * row (and wrap around at the ends), and the row is scrolled into view. Give the highlighted option
 * `data-nav-active="true"`; Enter then takes `active`. `resetKey` (the typed text) puts the highlight back on the first row.
 */
export function useResultNav(count: number, resetKey: string) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex(0)
  }, [resetKey])

  const active = count === 0 ? 0 : Math.min(index, count - 1)

  useEffect(() => {
    document.querySelector<HTMLElement>('[data-nav-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active, count])

  /** True when the key was an arrow it handled (the caller then has nothing more to do with it). */
  function onNavKey(event: KeyboardEvent): boolean {
    if (count === 0 || (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')) return false
    event.preventDefault()
    setIndex(event.key === 'ArrowDown' ? (active + 1) % count : (active - 1 + count) % count)
    return true
  }

  return { active, setActive: setIndex, onNavKey }
}
