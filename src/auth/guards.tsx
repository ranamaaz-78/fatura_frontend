import { Hourglass, Loader2, LogOut } from 'lucide-react'
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

/** What a staff member sees while the owner has not finished the company setup. */
function SetupPending() {
  const { logout } = useAuth()

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f9ff] px-5">
      <div className="w-full max-w-[460px] rounded-3xl border border-[#dbe1ff] bg-white p-8 text-center shadow-[0_20px_50px_rgba(2,6,23,0.06)]">
        <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <Hourglass className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-[24px] font-extrabold tracking-[-0.02em] text-[#0b1c30]">
          {t('setup.pendingTitle', 'Almost there')}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-[#434655]">
          {t('setup.pendingBody', 'The company owner has not finished setting up the company yet. You can start as soon as they do.')}
        </p>
        <button
          type="button"
          onClick={() => void logout()}
          className="mt-6 inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-[#dbe1ff] px-5 text-sm font-semibold text-[#0b1c30] hover:border-[#c3d4ff]"
        >
          <LogOut className="h-4 w-4" />
          {t('setup.logout', 'Log out')}
        </button>
      </div>
    </div>
  )
}

/**
 * The workspace stays closed until the company has all its details and a logo. The owner is sent to the
 * setup steps; anyone else waits for the owner.
 */
export function RequireSetupDone() {
  const { session } = useAuth()
  const company = session?.company

  if (company && company.profile_complete === false) {
    return session?.role === 'business_admin' ? <Navigate to="/app/setup" replace /> : <SetupPending />
  }

  return <Outlet />
}
