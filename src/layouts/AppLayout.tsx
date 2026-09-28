import { useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BottomTabs } from '../components/layout/BottomTabs'
import { APP_NAV, TAB_ROOTS } from '../components/layout/nav'
import { Sidebar } from '../components/layout/Sidebar'
import { ThemeDock } from '../components/layout/ThemeDock'
import { TopBar } from '../components/layout/TopBar'
import { t } from '../i18n'
import { ThemeProvider } from '../theme/ThemeProvider'

function titleForPath(pathname: string): string {
  for (const group of APP_NAV) {
    for (const item of group.items) {
      if (item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`)) {
        return t(item.labelKey, item.fallback)
      }
    }
  }
  if (pathname === '/app/invoices/new') return t('sales.newTitle', 'New sale')
  if (pathname.endsWith('/edit') && pathname.includes('/quotes/')) return t('sales.editQuote', 'Edit quotation')
  if (pathname.startsWith('/app/invoices/')) return t('nav.invoice', 'Invoice')
  return t('app.name', 'Fatura')
}

function Shell() {
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const isTabRoot = TAB_ROOTS.includes(location.pathname)
  const title = useMemo(() => titleForPath(location.pathname), [location.pathname])

  return (
    <>
      <aside className="app-sidebar hidden w-64 shrink-0 select-none border-r border-sidebar-line bg-sidebar text-sidebar-text print:hidden lg:flex lg:flex-col">
        <Sidebar />
      </aside>

      {menuOpen ? (
        <div className="lg:hidden fixed inset-0 z-50 print:hidden">
          <div className="absolute inset-0 bg-overlay backdrop-blur-xs" onClick={() => setMenuOpen(false)} />
          <div className="app-sidebar fixed inset-y-0 left-0 z-50 w-72">
            <Sidebar onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col print:contents">
        <div className="print:hidden">
          <TopBar
            title={title}
            showBack={!isTabRoot}
            onBack={() => navigate(-1)}
            onMenu={() => setMenuOpen(true)}
          />
        </div>
        <main className="flex-1 space-y-6 overflow-y-auto p-4 overscroll-contain sm:p-6 print:contents">
          <Outlet />
        </main>
        <div className="print:hidden">
          <BottomTabs />
        </div>
      </div>

      <ThemeDock />
    </>
  )
}

export function AppLayout() {
  return (
    <ThemeProvider>
      <Shell />
    </ThemeProvider>
  )
}
