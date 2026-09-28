export const THEME_SCHEME_IDS = [
  'ocean',
  'violet',
  'teal',
  'forest',
  'gold',
  'wine',
  'sky',
  'copper',
  'ink',
  'fuchsia',
] as const

export type ThemeSchemeId = (typeof THEME_SCHEME_IDS)[number]
export type ThemeMode = 'light' | 'dark'

export type ThemeTokens = {
  primary: string
  hover: string
  secondary: string
  soft: string
  onPrimary: string
  page: string
  card: string
  elevated: string
  ink: string
  muted: string
  line: string
  sidebar: string
  sidebarText: string
  sidebarMuted: string
  sidebarHover: string
  sidebarLine: string
  overlay: string
}

export type ThemePreference = {
  scheme: ThemeSchemeId
  mode: ThemeMode
  dockOpen: boolean
}

export const DEFAULT_THEME: ThemePreference = {
  scheme: 'ocean',
  mode: 'light',
  dockOpen: false,
}

const LIGHT_SURFACE = {
  page: '#f8f9ff',
  card: '#ffffff',
  elevated: '#f1f5f9',
  ink: '#0b1c30',
  muted: '#64748b',
  line: '#e2e8f0',
  sidebar: '#0f172a',
  sidebarText: '#e2e8f0',
  sidebarMuted: '#94a3b8',
  sidebarHover: 'rgb(255 255 255 / 0.08)',
  sidebarLine: 'rgb(148 163 184 / 0.18)',
  overlay: 'rgb(15 23 42 / 0.6)',
} as const

const DARK_SURFACE = {
  page: '#0b1220',
  card: '#111827',
  elevated: '#1e293b',
  ink: '#f1f5f9',
  muted: '#94a3b8',
  line: '#334155',
  sidebar: '#020617',
  sidebarText: '#e2e8f0',
  sidebarMuted: '#94a3b8',
  sidebarHover: 'rgb(255 255 255 / 0.08)',
  sidebarLine: 'rgb(148 163 184 / 0.16)',
  overlay: 'rgb(2 6 23 / 0.72)',
} as const

type Hue = Pick<ThemeTokens, 'primary' | 'hover' | 'secondary' | 'soft' | 'onPrimary'>

const LIGHT_HUE: Record<ThemeSchemeId, Hue> = {
  ocean: { primary: '#004ac6', hover: '#2563eb', secondary: '#0e7490', soft: '#eff4ff', onPrimary: '#ffffff' },
  violet: { primary: '#6d28d9', hover: '#7c3aed', secondary: '#7c3aed', soft: '#f5f3ff', onPrimary: '#ffffff' },
  teal: { primary: '#0f766e', hover: '#0d9488', secondary: '#0e7490', soft: '#f0fdfa', onPrimary: '#ffffff' },
  forest: { primary: '#166534', hover: '#15803d', secondary: '#3f6212', soft: '#f0fdf4', onPrimary: '#ffffff' },
  gold: { primary: '#b45309', hover: '#d97706', secondary: '#a16207', soft: '#fffbeb', onPrimary: '#ffffff' },
  wine: { primary: '#be123c', hover: '#9f1239', secondary: '#9f1239', soft: '#fff1f2', onPrimary: '#ffffff' },
  sky: { primary: '#0369a1', hover: '#0284c7', secondary: '#0284c7', soft: '#f0f9ff', onPrimary: '#ffffff' },
  copper: { primary: '#c2410c', hover: '#ea580c', secondary: '#ea580c', soft: '#fff7ed', onPrimary: '#ffffff' },
  ink: { primary: '#334155', hover: '#475569', secondary: '#475569', soft: '#f1f5f9', onPrimary: '#ffffff' },
  fuchsia: { primary: '#a21caf', hover: '#c026d3', secondary: '#c026d3', soft: '#fdf4ff', onPrimary: '#ffffff' },
}

const DARK_HUE: Record<ThemeSchemeId, Hue> = {
  ocean: { primary: '#60a5fa', hover: '#3b82f6', secondary: '#22d3ee', soft: '#172554', onPrimary: '#0b1220' },
  violet: { primary: '#a78bfa', hover: '#8b5cf6', secondary: '#c4b5fd', soft: '#2e1065', onPrimary: '#0b1220' },
  teal: { primary: '#2dd4bf', hover: '#14b8a6', secondary: '#22d3ee', soft: '#042f2e', onPrimary: '#0b1220' },
  forest: { primary: '#4ade80', hover: '#22c55e', secondary: '#a3e635', soft: '#052e16', onPrimary: '#0b1220' },
  gold: { primary: '#fbbf24', hover: '#f59e0b', secondary: '#facc15', soft: '#451a03', onPrimary: '#0b1220' },
  wine: { primary: '#fb7185', hover: '#f43f5e', secondary: '#fda4af', soft: '#4c0519', onPrimary: '#0b1220' },
  sky: { primary: '#38bdf8', hover: '#0ea5e9', secondary: '#67e8f9', soft: '#082f49', onPrimary: '#0b1220' },
  copper: { primary: '#fb923c', hover: '#f97316', secondary: '#fdba74', soft: '#431407', onPrimary: '#0b1220' },
  ink: { primary: '#94a3b8', hover: '#cbd5e1', secondary: '#64748b', soft: '#1e293b', onPrimary: '#0b1220' },
  fuchsia: { primary: '#e879f9', hover: '#d946ef', secondary: '#f0abfc', soft: '#4a044e', onPrimary: '#0b1220' },
}

export const THEME_SCHEMES: { id: ThemeSchemeId; labelKey: string; fallback: string }[] = [
  { id: 'ocean', labelKey: 'theme.ocean', fallback: 'Ocean' },
  { id: 'violet', labelKey: 'theme.violet', fallback: 'Violet' },
  { id: 'teal', labelKey: 'theme.teal', fallback: 'Teal' },
  { id: 'forest', labelKey: 'theme.forest', fallback: 'Forest' },
  { id: 'gold', labelKey: 'theme.gold', fallback: 'Gold' },
  { id: 'wine', labelKey: 'theme.wine', fallback: 'Wine' },
  { id: 'sky', labelKey: 'theme.sky', fallback: 'Sky' },
  { id: 'copper', labelKey: 'theme.copper', fallback: 'Copper' },
  { id: 'ink', labelKey: 'theme.ink', fallback: 'Ink' },
  { id: 'fuchsia', labelKey: 'theme.fuchsia', fallback: 'Fuchsia' },
]

export function isThemeSchemeId(value: string): value is ThemeSchemeId {
  return (THEME_SCHEME_IDS as readonly string[]).includes(value)
}

export function getThemeTokens(scheme: ThemeSchemeId, mode: ThemeMode): ThemeTokens {
  const hue = mode === 'dark' ? DARK_HUE[scheme] : LIGHT_HUE[scheme]
  const surface = mode === 'dark' ? DARK_SURFACE : LIGHT_SURFACE
  return { ...surface, ...hue }
}

export function swatchColor(scheme: ThemeSchemeId): string {
  return LIGHT_HUE[scheme].primary
}

export function tokensToCssVars(tokens: ThemeTokens): Record<string, string> {
  return {
    '--app-primary': tokens.primary,
    '--app-hover': tokens.hover,
    '--app-secondary': tokens.secondary,
    '--app-soft': tokens.soft,
    '--app-on-primary': tokens.onPrimary,
    '--app-page': tokens.page,
    '--app-card': tokens.card,
    '--app-elevated': tokens.elevated,
    '--app-ink': tokens.ink,
    '--app-muted': tokens.muted,
    '--app-line': tokens.line,
    '--app-sidebar': tokens.sidebar,
    '--app-sidebar-text': tokens.sidebarText,
    '--app-sidebar-muted': tokens.sidebarMuted,
    '--app-sidebar-hover': tokens.sidebarHover,
    '--app-sidebar-line': tokens.sidebarLine,
    '--app-overlay': tokens.overlay,
    '--color-brand-50': tokens.soft,
    '--color-brand-100': tokens.soft,
    '--color-brand-200': tokens.soft,
    '--color-brand-500': tokens.hover,
    '--color-brand-600': tokens.primary,
    '--color-brand-on': tokens.onPrimary,
    '--color-ink': tokens.ink,
    '--color-ink-muted': tokens.muted,
    '--color-line': tokens.line,
    '--color-page': tokens.page,
    '--color-card': tokens.card,
    '--color-elevated': tokens.elevated,
    '--color-sidebar': tokens.sidebar,
    '--color-sidebar-text': tokens.sidebarText,
    '--color-sidebar-muted': tokens.sidebarMuted,
    '--color-sidebar-hover': tokens.sidebarHover,
    '--color-sidebar-line': tokens.sidebarLine,
    '--color-overlay': tokens.overlay,
  }
}

export function applyThemeToElement(
  element: HTMLElement,
  tokens: ThemeTokens,
  scheme: ThemeSchemeId,
  mode: ThemeMode,
): void {
  element.dataset.appMode = mode
  element.dataset.appTheme = scheme
  for (const [key, value] of Object.entries(tokensToCssVars(tokens))) {
    element.style.setProperty(key, value)
  }
}

export function clearThemeFromElement(element: HTMLElement): void {
  delete element.dataset.appMode
  delete element.dataset.appTheme
  for (const key of Object.keys(tokensToCssVars(getThemeTokens('ocean', 'light')))) {
    element.style.removeProperty(key)
  }
}
