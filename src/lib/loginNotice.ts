/** A message for the sign-in screen, kept across the redirect: why the person was signed out. */
const KEY = 'login-notice'

export function setLoginNotice(message: string): void {
  try {
    window.sessionStorage.setItem(KEY, message)
  } catch {
    /* private window: the message is simply not shown */
  }
}

/** Read once: it disappears after it has been shown. */
export function takeLoginNotice(): string | null {
  try {
    const message = window.sessionStorage.getItem(KEY)
    if (message) window.sessionStorage.removeItem(KEY)
    return message
  } catch {
    return null
  }
}
