import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'

/** A glass panel with an optional title row. Never put a dialog inside one: the glass would trap its position. */
export function Panel({
  title,
  action,
  className,
  bodyClassName,
  children,
}: {
  title?: ReactNode
  action?: ReactNode
  className?: string
  bodyClassName?: string
  children: ReactNode
}) {
  return (
    <section className={cn('desk-glass overflow-hidden', className)}>
      {title || action ? (
        <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
          <h2 className="text-[11px] font-bold tracking-[0.12em] text-ink-muted uppercase">{title}</h2>
          {action}
        </header>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}

export function PanelLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="rounded-lg px-2 py-1 text-[11px] font-semibold text-brand-600 transition hover:bg-brand-50">
      {children}
    </Link>
  )
}

/** A small number tile: label, big figure, a line under it, and an icon chip in the corner. */
export function KpiTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'brand',
  children,
  className,
}: {
  label: string
  value: string
  hint?: ReactNode
  icon: LucideIcon
  tone?: keyof typeof TONES
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('desk-glass desk-lift relative flex flex-col overflow-hidden p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold tracking-[0.12em] text-ink-muted uppercase">{label}</p>
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', TONES[tone])}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <p className="desk-num mt-3 text-[26px] leading-none font-extrabold text-ink">{value}</p>
      {hint ? <p className="mt-2 text-[12px] leading-snug text-ink-muted">{hint}</p> : null}
      {children}
    </div>
  )
}

export const TONES = {
  brand: 'bg-brand-600/12 text-brand-600',
  emerald: 'bg-emerald-500/12 text-emerald-600 app-dark:text-emerald-300',
  amber: 'bg-amber-500/14 text-amber-600 app-dark:text-amber-300',
  rose: 'bg-rose-500/12 text-rose-600 app-dark:text-rose-300',
  sky: 'bg-sky-500/12 text-sky-600 app-dark:text-sky-300',
  violet: 'bg-violet-500/12 text-violet-600 app-dark:text-violet-300',
  teal: 'bg-teal-500/12 text-teal-600 app-dark:text-teal-300',
  slate: 'bg-slate-500/12 text-slate-600 app-dark:text-slate-300',
} as const

/** A tiny line chart drawn from a list of numbers, filled underneath. */
export function Sparkline({ values, className, color = 'var(--app-primary)' }: { values: number[]; className?: string; color?: string }) {
  if (values.length < 2) return null
  const width = 120
  const height = 36
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const span = Math.max(max - min, 1)
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width
    const y = height - 2 - ((value - min) / span) * (height - 4)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const id = `spark-${Math.round(max)}-${values.length}`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className={cn('h-9 w-full', className)} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${points.join(' ')} ${width},${height}`} fill={`url(#${id})`} />
      <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export const PILL = {
  paid: 'bg-emerald-500/12 text-emerald-700 ring-emerald-500/25 app-dark:text-emerald-300',
  partial: 'bg-sky-500/12 text-sky-700 ring-sky-500/25 app-dark:text-sky-300',
  pending: 'bg-amber-500/14 text-amber-700 ring-amber-500/25 app-dark:text-amber-300',
  voided: 'bg-rose-500/12 text-rose-700 ring-rose-500/25 app-dark:text-rose-300',
  neutral: 'bg-slate-500/10 text-slate-600 ring-slate-500/20 app-dark:text-slate-300',
  violet: 'bg-violet-500/12 text-violet-700 ring-violet-500/25 app-dark:text-violet-300',
} as const

export function Pill({ tone, children, dot = true, className }: { tone: keyof typeof PILL; children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold ring-1 ring-inset', PILL[tone], className)}>
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  )
}

/** A keyboard key, for the shortcut hints. */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd className={cn('inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-current/25 px-1.5 text-[10px] font-bold opacity-80', className)}>
      {children}
    </kbd>
  )
}

/** The big title at the top of a screen. */
export function ScreenHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: ReactNode; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <p className="text-[11px] font-bold tracking-[0.14em] text-brand-600 uppercase">{eyebrow}</p> : null}
        <h1 className="mt-1 truncate text-[28px] leading-tight font-extrabold tracking-[-0.03em] text-ink">{title}</h1>
        {subtitle ? <p className="mt-1 text-[13px] text-ink-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}

export const deskButton = {
  base: 'inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-[13px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
  primary: 'desk-glow bg-brand-600 text-brand-on hover:bg-brand-500',
  ghost: 'border border-line bg-card/70 text-ink hover:border-brand-500/40 hover:bg-card',
  quiet: 'text-ink-muted hover:bg-elevated hover:text-ink',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
} as const

export function deskButtonClass(variant: Exclude<keyof typeof deskButton, 'base'>, className?: string): string {
  return cn(deskButton.base, deskButton[variant], className)
}

export function Shimmer({ className }: { className?: string }) {
  return <div className={cn('desk-glass animate-pulse', className)} />
}
