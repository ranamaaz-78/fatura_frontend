import { Loader2 } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { t } from '../i18n'
import { homeFor, useAuth } from './AuthProvider'
import type { UserRole } from '../types/module01'

function Booting() {
  return (
    <div className="min-h-screen flex items-center justify-center gap-2 text-sm text-slate-500">
      <Loader2 className="w-4 h-4 animate-spin" />
      {t('common.loading', 'Loading')}
    </div>
  )
}

/** Signed-in users never see the login or set-password screens. */
export function RequireGuest() {
  const { status, session } = useAuth()

  if (status === 'loading') return <Booting />
  if (status === 'authenticated') return <Navigate to={homeFor(session?.role)} replace />
  return <Outlet />
}

export function RequireRole({ roles }: { roles: UserRole[] }) {
  const { status, session } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <Booting />
  if (status === 'guest') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  if (session && !roles.includes(session.role)) {
    return <Navigate to={homeFor(session.role)} replace />
  }
  return <Outlet />
}
