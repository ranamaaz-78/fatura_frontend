import { useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BottomTabs } from '../components/layout/BottomTabs'
import { APP_NAV, TAB_ROOTS } from '../components/layout/nav'
import { Sidebar } from '../components/layout/Sidebar'
import { TopBar } from '../components/layout/TopBar'
import { t } from '../i18n'

function titleForPath(pathname: string): string {
  for (const group of APP_NAV) {
    for (const item of group.items) {
      if (item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`)) {
        return t(item.labelKey, item.fallback)
      }
    }
  }
  if (pathname === '/app/invoices/new') return t('sales.newTitle', 'New sale')
  if (pathname.startsWith('/app/invoices/')) return t('nav.invoice', 'Invoice')
  return t('app.name', 'Fatura')
}

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const isTabRoot = TAB_ROOTS.includes(location.pathname)
  const title = useMemo(() => titleForPath(location.pathname), [location.pathname])

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-slate-50 print:static print:block print:h-auto print:overflow-visible">
      <aside className="hidden w-64 shrink-0 border-r border-slate-800 bg-slate-900 text-slate-300 select-none lg:flex lg:flex-col print:hidden">
        <Sidebar />
      </aside>

      {menuOpen ? (
        <div className="lg:hidden fixed inset-0 z-50 print:hidden">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 z-50">
            <Sidebar onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col print:block">
        <div className="print:hidden">
          <TopBar
            title={title}
            showBack={!isTabRoot}
            onBack={() => navigate(-1)}
            onMenu={() => setMenuOpen(true)}
          />
        </div>
        <main className="flex-1 space-y-6 overflow-y-auto p-4 overscroll-contain sm:p-6 print:overflow-visible print:p-0">
          <Outlet />
        </main>
        <div className="print:hidden">
          <BottomTabs />
        </div>
      </div>
    </div>
  )
}
