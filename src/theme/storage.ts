import {
  DEFAULT_THEME,
  isThemeSchemeId,
  type ThemeMode,
  type ThemePreference,
} from './schemes'

export const THEME_STORAGE_KEY = 'fatura.theme'

function isMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark'
}

export function readThemePreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    if (!raw) return DEFAULT_THEME
    const parsed = JSON.parse(raw) as Partial<ThemePreference>
    return {
      scheme: typeof parsed.scheme === 'string' && isThemeSchemeId(parsed.scheme) ? parsed.scheme : DEFAULT_THEME.scheme,
      mode: isMode(parsed.mode) ? parsed.mode : DEFAULT_THEME.mode,
      dockOpen: parsed.dockOpen === true,
    }
  } catch {
    return DEFAULT_THEME
  }
}

export function writeThemePreference(preference: ThemePreference): void {
  localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(preference))
}
