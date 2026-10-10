import { NavLink } from 'react-router-dom'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { usePermissions } from '../../auth/permissions'
import { APP_TABS, navAllowed, type Accent } from './nav'

export type BottomTabsProps = {
  accent?: Accent
}

export function BottomTabs({ accent = 'blue' }: BottomTabsProps) {
  const active = accent === 'indigo' ? 'text-indigo-600' : 'text-brand-600'
  const { can, isOwner } = usePermissions()
  const tabs = accent === 'indigo' ? APP_TABS : APP_TABS.filter((item) => navAllowed(item, can, isOwner))

  return (
    <nav
      className="lg:hidden shrink-0 bg-card border-t border-line grid pb-[env(safe-area-inset-bottom)]"
      style={{ gridTemplateColumns: `repeat(${Math.max(tabs.length, 1)}, minmax(0, 1fr))` }}
    >
      {tabs.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-0.5 h-14 text-[10px] font-medium transition-colors',
                'active:bg-page',
                isActive ? active : 'text-ink-muted',
              )
            }
          >
            <Icon className="w-5 h-5" />
            {t(item.labelKey, item.fallback)}
          </NavLink>
        )
      })}
    </nav>
  )
}
