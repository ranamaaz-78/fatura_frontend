import { useSyncExternalStore } from 'react'

/** Whether this person closed the "Practice in the demo" card on the dashboard. Kept on this device; Settings turns it back on. */
const KEY = 'demo_card_hidden'
const listeners = new Set<() => void>()

function read(): boolean {
  try {
    return window.localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function setDemoCardHidden(hidden: boolean): void {
  try {
    if (hidden) window.localStorage.setItem(KEY, '1')
    else window.localStorage.removeItem(KEY)
  } catch {
    /* private window: the card comes back on the next visit */
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useDemoCardHidden(): boolean {
  return useSyncExternalStore(subscribe, read, () => false)
}
