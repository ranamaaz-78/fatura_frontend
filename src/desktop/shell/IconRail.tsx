import { LogOut } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { usePermissions } from '../../auth/permissions'
import { Logo } from '../../components/brand/Logo'
import { ADMIN_NAV, APP_NAV, navAllowed } from '../../components/layout/nav'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'

/**
 * The menu as a slim rail of icons. Resting on it opens it over the page with the names and groups, the same menu
 * (and the same permission rules) as the website's sidebar.
 */
export function IconRail({ admin }: { admin: boolean }) {
  const { session, logout } = useAuth()
  const { can, isOwner } = usePermissions()
  const groups = (admin ? ADMIN_NAV : APP_NAV)
    .map((group) => ({ ...group, items: admin ? group.items : group.items.filter((item) => navAllowed(item, can, isOwner)) }))
    .filter((group) => group.items.length > 0)
  const userName = session?.user.name ?? ''
  const company = admin ? t('nav.roleAdmin', 'Platform admin') : (session?.company?.name ?? '')

  return (
    <aside data-tour="menu" className="relative z-30 w-[var(--desk-rail)] shrink-0 select-none print:hidden">
      <div className="desk-chrome group/rail absolute inset-y-0 left-0 flex w-[var(--desk-rail)] flex-col overflow-hidden border-r border-white/8 transition-[width,box-shadow] duration-200 ease-out hover:w-[264px] hover:shadow-[24px_0_48px_-24px_rgb(0_0_0/0.5)]">
        <div className="flex h-16 shrink-0 items-center gap-3 px-[18px]">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/8 ring-1 ring-white/10">
            <Logo mark on="dark" className="h-6" />
          </span>
          <span className="min-w-0 opacity-0 transition-opacity duration-150 group-hover/rail:opacity-100">
            <span className="block truncate text-[13px] font-bold text-white">{t('app.name', 'YK Digital Solutions')}</span>
            <span className="block truncate text-[11px] text-sidebar-muted">{company}</span>
          </span>
        </div>

        {/* No visible scrollbar: it would eat into the 48px the icons are centred in (the wheel still scrolls). */}
        <nav className="desk-rail-nav flex-1 space-y-4 overflow-x-hidden overflow-y-auto px-3 py-2">
          {groups.map((group) => (
            <div key={group.titleKey}>
              <p className="mb-1.5 h-4 truncate px-3 text-[10px] font-semibold tracking-[0.12em] text-sidebar-muted uppercase opacity-0 transition-opacity duration-150 group-hover/rail:opacity-100">
                {t(group.titleKey, group.titleFallback)}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const label = t(item.labelKey, item.fallback)
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      title={label}
                      data-tour={`nav:${item.to}`}
                      className={({ isActive }) =>
                        cn(
                          // 14px + 20px icon + 14px = the 48px of the folded rail, so the icon sits dead centre in its box.
                          'relative flex h-12 items-center gap-3.5 rounded-xl px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors',
                          isActive
                            ? 'desk-glow bg-brand-600 text-brand-on'
                            : item.highlight
                              ? 'bg-white/6 text-white hover:bg-white/12'
                              : 'text-sidebar-muted hover:bg-white/8 hover:text-white',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon className="h-5 w-5 shrink-0" strokeWidth={isActive ? 2.3 : 1.9} />
                          <span className="opacity-0 transition-opacity duration-150 group-hover/rail:opacity-100">{label}</span>
                          {item.highlight && !isActive ? (
                            <span className="absolute top-2.5 left-[30px] h-2 w-2 rounded-full bg-brand-500 ring-2 ring-[var(--desk-chrome)]" />
                          ) : null}
                        </>
                      )}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-3 border-t border-white/8 px-[18px] py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-600 text-[12px] font-bold text-brand-on">
            {initials(userName)}
          </span>
          <span className="min-w-0 flex-1 opacity-0 transition-opacity duration-150 group-hover/rail:opacity-100">
            <span className="block truncate text-xs font-semibold text-white">{userName}</span>
            <span className="block truncate text-[11px] text-sidebar-muted">{session?.user.email}</span>
          </span>
          <button
            type="button"
            onClick={() => void logout()}
            title={t('nav.logout', 'Log out')}
            aria-label={t('nav.logout', 'Log out')}
            className="rounded-lg p-2 text-sidebar-muted opacity-0 transition hover:bg-white/10 hover:text-white group-hover/rail:opacity-100"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'YK'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase()
}
