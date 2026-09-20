import { Building2, LogOut, ScanLine, ShieldCheck } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { Avatar } from '../ui/Avatar'
import { ADMIN_NAV, APP_NAV, type Accent } from './nav'

export type SidebarProps = {
  accent?: Accent
  onNavigate?: () => void
}

export function Sidebar({ accent = 'blue', onNavigate }: SidebarProps) {
  const isAdmin = accent === 'indigo'
  const groups = isAdmin ? ADMIN_NAV : APP_NAV
  const brand = isAdmin ? 'bg-indigo-600' : 'bg-blue-600'
  const active = isAdmin ? 'bg-indigo-600 text-white shadow-xs' : 'bg-blue-600 text-white shadow-xs'
  const highlightIdle = isAdmin
    ? 'text-indigo-400 bg-indigo-600/10'
    : 'text-blue-400 bg-blue-600/10'
  const versionColor = isAdmin ? 'text-indigo-400' : 'text-blue-400'
  const companyIcon = isAdmin
    ? 'bg-indigo-600/30 text-indigo-400'
    : 'bg-blue-600/30 text-blue-400'

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300 select-none">
      <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center gap-2.5">
        <div className={cn('w-8 h-8 rounded-lg text-white inline-flex items-center justify-center', brand)}>
          {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <ScanLine className="w-4 h-4" />}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-bold text-white tracking-tight text-base truncate">
              {t('app.name', 'Fatura')}
            </p>
            {isAdmin ? <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> : null}
          </div>
          <p className={cn('text-[10px] font-mono', versionColor)}>v0.0.0</p>
        </div>
      </div>

      <div className="mx-3 mt-3 bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/60 flex items-center gap-2.5">
        <div className={cn('w-7 h-7 rounded-lg inline-flex items-center justify-center', companyIcon)}>
          <Building2 className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white truncate">
            {t('nav.companyName', 'Fatura Demo')}
          </p>
          <p className="text-[10px] text-slate-400 font-mono truncate">
            {t('nav.taxId', '-')}
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {groups.map((group) => (
          <div key={group.titleKey}>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2">
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
                            ? cn(highlightIdle, 'hover:bg-slate-800 hover:text-white')
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white',
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

      <div className="p-3 border-t border-slate-800 flex items-center gap-2.5">
        <Avatar name={t('nav.userName', 'Demo User')} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-white truncate">{t('nav.userName', 'Demo User')}</p>
          <p className="text-[10px] text-slate-400 truncate">
            {isAdmin ? t('nav.roleAdmin', 'Platform admin') : t('nav.roleOwner', 'Owner')}
          </p>
        </div>
        <NavLink
          to="/login"
          onClick={onNavigate}
          title={t('nav.logout', 'Log out')}
          aria-label={t('nav.logout', 'Log out')}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </NavLink>
      </div>
    </div>
  )
}
