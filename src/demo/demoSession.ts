import { getAuthToken, setAuthToken } from '../services/api'

/**
 * Where the customer's own token waits while they are inside the shared demo. Going in swaps the demo's token into
 * place; coming out (or the demo's token running out) puts this one back.
 */
const RETURN_KEY = 'demo_return_token'

/** Whether this browser is inside the demo right now: there is a token waiting to be put back. */
export function inDemoVisit(): boolean {
  try {
    return window.localStorage.getItem(RETURN_KEY) !== null
  } catch {
    return false
  }
}

/** Keeps the customer's own token aside and puts the demo's in its place. */
export function beginDemoVisit(demoToken: string): void {
  try {
    window.localStorage.setItem(RETURN_KEY, getAuthToken() ?? '')
  } catch {
    /* private window: the visit then lasts until the tab closes, and the person signs in again afterwards */
  }
  setAuthToken(demoToken)
}

/** Puts the customer's own token back. Returns it, or null when there was no visit to end. */
export function endDemoVisit(): string | null {
  let back: string | null = null
  try {
    back = window.localStorage.getItem(RETURN_KEY)
    window.localStorage.removeItem(RETURN_KEY)
  } catch {
    return null
  }

  if (back === null) return null
  setAuthToken(back === '' ? null : back)
  return back === '' ? null : back
}
