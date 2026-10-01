import { Building2, LogOut } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { Logo } from '../brand/Logo'
import { Avatar } from '../ui/Avatar'
import { ADMIN_NAV, APP_NAV, type Accent } from './nav'

export type SidebarProps = {
  accent?: Accent
  onNavigate?: () => void
}

export function Sidebar({ accent = 'blue', onNavigate }: SidebarProps) {
  const { session, logout } = useAuth()
  const isAdmin = accent === 'indigo'
  const groups = isAdmin ? ADMIN_NAV : APP_NAV
  const company = session?.company ?? null
  const userName = session?.user.name ?? t('nav.userName', 'Demo User')
  const roleLabel =
    session?.role === 'super_admin'
      ? t('nav.roleAdmin', 'Platform admin')
      : session?.role === 'staff'
        ? t('nav.roleStaff', 'Staff')
        : t('nav.roleOwner', 'Owner')
  const active = isAdmin ? 'bg-indigo-600 text-white shadow-xs' : 'bg-brand-600 text-brand-on shadow-xs'
  const highlightIdle = isAdmin
    ? 'text-indigo-400 bg-indigo-600/10'
    : 'text-brand-500 bg-brand-600/10'
  const companyIcon = isAdmin
    ? 'bg-indigo-600/30 text-indigo-400'
    : 'bg-brand-600/30 text-brand-500'

  return (
    <div className="app-sidebar flex h-full select-none flex-col bg-sidebar text-sidebar-text">
      <div className="flex items-center border-b border-sidebar-line bg-black/30 px-4 py-3.5">
        <Logo on="dark" className="h-11" />
      </div>

      <div className="mx-3 mt-3 flex items-center gap-2.5 rounded-xl border border-sidebar-line bg-white/5 p-2.5">
        <div className={cn('w-7 h-7 rounded-lg inline-flex items-center justify-center', companyIcon)}>
          <Building2 className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white truncate">
            {isAdmin ? t('app.name', 'YK Digital Solutions') : (company?.name ?? t('nav.companyName', 'YK Digital Solutions'))}
          </p>
          <p className="truncate text-[10px] text-sidebar-muted">
            {isAdmin ? t('nav.roleAdmin', 'Platform admin') : (company?.email ?? t('nav.taxId', '-'))}
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {groups.map((group) => (
          <div key={group.titleKey}>
            <p className="mb-2 px-2 text-[10px] font-semibold tracking-wider text-sidebar-muted uppercase">
              {t(group.titleKey, group.titleFallback)}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-colors',
                        isActive
                          ? active
                          : item.highlight
                            ? cn(highlightIdle, 'hover:bg-sidebar-hover hover:text-white')
                            : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-white',
                      )
                    }
                  >
                    <Icon className="w-4 h-4" />
                    {t(item.labelKey, item.fallback)}
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-2.5 border-t border-sidebar-line p-3">
        <Avatar name={userName} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-white truncate">{userName}</p>
          <p className="truncate text-[10px] text-sidebar-muted">{roleLabel}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            onNavigate?.()
            void logout()
          }}
          title={t('nav.logout', 'Log out')}
          aria-label={t('nav.logout', 'Log out')}
          className="rounded-lg p-2 text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-white"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
