import { Building2, CalendarClock, Download, Wifi, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { desktopVersion } from '../../lib/desktop'
import { daysText, subscriptionInfo } from '../../lib/subscription'

const STATE_DOT = {
  active: 'bg-emerald-400',
  expiring: 'bg-amber-400',
  expired: 'bg-rose-400',
  none: 'bg-slate-400',
} as const

/** The strip along the bottom: which company, how long the plan runs, whether the server can be reached. */
export function StatusBar({ admin, update, onShowUpdate }: { admin: boolean; update: DesktopUpdateStatus | null; onShowUpdate: () => void }) {
  const { session } = useAuth()
  const online = useOnline()
  const company = session?.company ?? null
  const plan = !admin && company ? subscriptionInfo(company) : null
  const roleLabel =
    session?.role === 'super_admin'
      ? t('nav.roleAdmin', 'Platform admin')
      : session?.role === 'staff'
        ? t('nav.roleStaff', 'Staff')
        : t('nav.roleOwner', 'Owner')

  return (
    <footer className="desk-chrome flex h-[var(--desk-statusbar)] shrink-0 items-center gap-5 border-t border-white/8 px-4 text-[11px] text-sidebar-muted select-none print:hidden">
      <span className="inline-flex min-w-0 items-center gap-1.5">
        <Building2 className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate font-medium text-sidebar-text">{admin ? t('app.name', 'YK Digital Solutions') : (company?.name ?? '')}</span>
        <span className="text-white/25">·</span>
        <span className="truncate">{roleLabel}</span>
      </span>

      {plan?.subscription ? (
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock className="h-3.5 w-3.5" />
          <span className={cn('h-1.5 w-1.5 rounded-full', STATE_DOT[plan.state])} />
          {daysText(plan)}
        </span>
      ) : null}

      {update?.version ? (
        // A new version waiting: one click brings the banner back.
        <button
          type="button"
          onClick={onShowUpdate}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-brand-600/25 px-2 py-0.5 font-semibold text-white transition hover:bg-brand-600/40"
        >
          <Download className="h-3.5 w-3.5" />
          {update.state === 'downloading'
            ? `${t('desk.updateDownloading', 'Downloading')} ${update.percent ?? 0}%`
            : t('desk.updateShort', 'Update {version}', { version: update.version })}
        </button>
      ) : null}

      <span className={cn('inline-flex items-center gap-1.5', update?.version ? '' : 'ml-auto')}>
        {online ? <Wifi className="h-3.5 w-3.5 text-emerald-400" /> : <WifiOff className="desk-pulse h-3.5 w-3.5 text-rose-400" />}
        {online ? t('desk.online', 'Connected') : t('desk.offline', 'No connection')}
      </span>
      {desktopVersion ? <span>v{desktopVersion}</span> : null}
    </footer>
  )
}

function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])
  return online
}
