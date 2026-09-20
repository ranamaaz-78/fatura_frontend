import { NavLink } from 'react-router-dom'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { APP_TABS, type Accent } from './nav'

export type BottomTabsProps = {
  accent?: Accent
}

export function BottomTabs({ accent = 'blue' }: BottomTabsProps) {
  const active = accent === 'indigo' ? 'text-indigo-600' : 'text-blue-600'

  return (
    <nav className="lg:hidden shrink-0 bg-white border-t border-slate-200 grid grid-cols-4 pb-[env(safe-area-inset-bottom)]">
      {APP_TABS.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-0.5 h-14 text-[10px] font-medium transition-colors',
                'active:bg-slate-100',
                isActive ? active : 'text-slate-500',
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
