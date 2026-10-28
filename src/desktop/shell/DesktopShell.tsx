import { Suspense, useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { preloadScreens } from '../screens'
import { docPermission, usePermissions } from '../../auth/permissions'
import { ThemeProvider } from '../../theme/ThemeProvider'
import '../desktop.css'
import { DemoLayer } from '../../demo/DemoLayer'
import { CommandPalette } from './CommandPalette'
import { IconRail } from './IconRail'
import { NEW_DOCUMENTS, newDocumentPath } from './routes'
import { StatusBar } from './StatusBar'
import { TitleBar } from './TitleBar'
import { UpdateBanner, updateWorthShowing } from './UpdateBanner'
import { useAppUpdate } from './useAppUpdate'

/**
 * The Windows app's workspace: title bar on top, icon rail on the left, status bar along the bottom, and the screen in
 * the middle. It takes the place of the website's AppLayout / AdminLayout; the screens and their routes are the same.
 */
export function DesktopShell({ admin = false }: { admin?: boolean }) {
  return (
    <ThemeProvider>
      <Workspace admin={admin} />
    </ThemeProvider>
  )
}

function Workspace({ admin }: { admin: boolean }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { can } = usePermissions()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const update = useAppUpdate()
  // "Later" hides one offer (this state of this version) until something new happens or the app restarts.
  const [laterKey, setLaterKey] = useState<string | null>(null)
  const updateKey = update ? `${update.state}:${update.version ?? ''}` : null
  const showUpdate = update !== null && updateWorthShowing(update) && laterKey !== updateKey

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((open) => !open)
        return
      }
      if (admin || event.ctrlKey || event.altKey || event.metaKey) return
      // F2 / F3 / F4 / F6 start a document, like the buttons on the dashboard.
      const doc = NEW_DOCUMENTS.find((item) => item.key === event.key)
      if (doc && can(docPermission(doc.type, 'create'))) {
        event.preventDefault()
        navigate(newDocumentPath(doc.type))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [admin, can, navigate])

  useEffect(() => preloadScreens(), [])

  return (
    <div className="desk-canvas flex min-w-0 flex-1 flex-col print:contents">
      <TitleBar admin={admin} onSearch={() => setPaletteOpen(true)} />
      <DemoLayer />
      <div className="flex min-h-0 flex-1 print:contents">
        <IconRail admin={admin} />
        <main data-tour="page" className="desk-scroll min-w-0 flex-1 overflow-y-auto overscroll-contain print:contents">
          {showUpdate ? (
            <div className="mx-auto w-full max-w-[1680px] px-7 pt-6 print:hidden">
              <UpdateBanner status={update} onLater={() => setLaterKey(updateKey)} />
            </div>
          ) : null}
          {/* Like the website, the new-sale screen is not remounted when ?type= changes: it switches type and keeps the lines. */}
          <div key={location.pathname} className="desk-rise mx-auto w-full max-w-[1680px] space-y-6 px-7 py-6 print:contents">
            <Suspense fallback={null}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
      <StatusBar admin={admin} update={update && updateWorthShowing(update) ? update : null} onShowUpdate={() => setLaterKey(null)} />
      <CommandPalette admin={admin} open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}
