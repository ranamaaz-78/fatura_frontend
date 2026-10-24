/**
 * The Windows app is this same site shown in a native window (see fatura_desktop). Its window hands the page a
 * small `window.desktop`; a normal browser has none, so everything here is a no-op outside the app.
 */
export const isDesktop = typeof window !== 'undefined' && window.desktop?.isDesktop === true

/**
 * The Windows app has its own look (src/desktop). It is chosen when the site is built for the app
 * (`vite --mode desktop`), so the website's build never carries it. `npm run dev -- --mode desktop` shows it in a browser.
 */
export const DESKTOP_UI = import.meta.env.MODE === 'desktop'

/** The app's version, shown in its status bar; empty outside the app. */
export const desktopVersion: string = (typeof window !== 'undefined' && window.desktop?.version) || ''

/**
 * The public website's address. In a browser that is simply where the page is; inside the app the page is served
 * from the app itself, so the real website has to be named (VITE_PUBLIC_URL) for links that leave the app, such
 * as the Apply page and the QR code printed on an invoice.
 */
export const PUBLIC_SITE_URL: string = (import.meta.env.VITE_PUBLIC_URL || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/+$/, '')

/** Opens a web address in the person's own browser (a new tab on the web). */
export function openExternal(url: string): void {
  if (window.desktop) {
    window.desktop.openExternal(url)
    return
  }

  window.open(url, '_blank', 'noopener,noreferrer')
}
