import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { cn } from '../lib/cn'
import {
  DEFAULT_THEME,
  applyThemeToElement,
  clearThemeFromElement,
  getThemeTokens,
  tokensToCssVars,
  type ThemeMode,
  type ThemePreference,
  type ThemeSchemeId,
  type ThemeTokens,
} from './schemes'
import { readThemePreference, writeThemePreference } from './storage'

type ThemeContextValue = {
  scheme: ThemeSchemeId
  mode: ThemeMode
  dockOpen: boolean
  tokens: ThemeTokens
  setScheme: (scheme: ThemeSchemeId) => void
  setMode: (mode: ThemeMode) => void
  setDockOpen: (open: boolean) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>(() =>
    typeof window === 'undefined' ? DEFAULT_THEME : readThemePreference(),
  )

  const patchPreference = useCallback((partial: Partial<ThemePreference>) => {
    setPreference((current) => {
      const next = { ...current, ...partial }
      writeThemePreference(next)
      return next
    })
  }, [])

  const setScheme = useCallback((scheme: ThemeSchemeId) => patchPreference({ scheme }), [patchPreference])
  const setMode = useCallback((mode: ThemeMode) => patchPreference({ mode }), [patchPreference])
  const setDockOpen = useCallback((dockOpen: boolean) => patchPreference({ dockOpen }), [patchPreference])

  const tokens = useMemo(
    () => getThemeTokens(preference.scheme, preference.mode),
    [preference.mode, preference.scheme],
  )

  useLayoutEffect(() => {
    applyThemeToElement(document.documentElement, tokens, preference.scheme, preference.mode)
    return () => clearThemeFromElement(document.documentElement)
  }, [preference.mode, preference.scheme, tokens])

  const value = useMemo(
    () => ({
      scheme: preference.scheme,
      mode: preference.mode,
      dockOpen: preference.dockOpen,
      tokens,
      setScheme,
      setMode,
      setDockOpen,
    }),
    [preference.dockOpen, preference.mode, preference.scheme, setDockOpen, setMode, setScheme, tokens],
  )

  return (
    <ThemeContext.Provider value={value}>
      <div
        className={cn(
          'app-shell fixed inset-0 flex overflow-hidden bg-page text-ink print:contents',
        )}
        data-theme={preference.scheme}
        data-mode={preference.mode}
        style={tokensToCssVars(tokens) as CSSProperties}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
