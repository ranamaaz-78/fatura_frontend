import { useEffect, useState } from 'react'

const updates = typeof window !== 'undefined' ? window.desktop?.updates : undefined

/** What the Windows app's updater is doing, kept up to date. Null outside the app or in an app too old to update itself. */
export function useAppUpdate(): DesktopUpdateStatus | null {
  const [status, setStatus] = useState<DesktopUpdateStatus | null>(null)

  useEffect(() => {
    if (!updates) return
    let live = true
    void updates.status().then((current) => {
      if (live && current) setStatus(current)
    })
    const stop = updates.onStatus((next) => setStatus(next))
    return () => {
      live = false
      stop()
    }
  }, [])

  return status
}

export const appUpdates = {
  check: () => updates?.check(),
  download: () => updates?.download(),
  install: () => updates?.install(),
}
