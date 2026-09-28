export type PrintFontGroup = 'sans' | 'serif' | 'system'

export type PrintFontDef = {
  key: string
  label: string
  group: PrintFontGroup
  stack: string
  google?: string
}

export const PRINT_FONTS: PrintFontDef[] = [
  { key: 'geist', label: 'Geist', group: 'sans', stack: "'Geist', -apple-system, 'Segoe UI', sans-serif" },
  { key: 'inter', label: 'Inter', group: 'sans', stack: "'Inter', sans-serif", google: 'Inter' },
  { key: 'roboto', label: 'Roboto', group: 'sans', stack: "'Roboto', sans-serif", google: 'Roboto' },
  { key: 'open_sans', label: 'Open Sans', group: 'sans', stack: "'Open Sans', sans-serif", google: 'Open Sans' },
  { key: 'lato', label: 'Lato', group: 'sans', stack: "'Lato', sans-serif", google: 'Lato' },
  { key: 'montserrat', label: 'Montserrat', group: 'sans', stack: "'Montserrat', sans-serif", google: 'Montserrat' },
  { key: 'poppins', label: 'Poppins', group: 'sans', stack: "'Poppins', sans-serif", google: 'Poppins' },
  { key: 'nunito', label: 'Nunito', group: 'sans', stack: "'Nunito', sans-serif", google: 'Nunito' },
  { key: 'nunito_sans', label: 'Nunito Sans', group: 'sans', stack: "'Nunito Sans', sans-serif", google: 'Nunito Sans' },
  { key: 'raleway', label: 'Raleway', group: 'sans', stack: "'Raleway', sans-serif", google: 'Raleway' },
  { key: 'work_sans', label: 'Work Sans', group: 'sans', stack: "'Work Sans', sans-serif", google: 'Work Sans' },
  { key: 'source_sans_3', label: 'Source Sans 3', group: 'sans', stack: "'Source Sans 3', sans-serif", google: 'Source Sans 3' },
  { key: 'ibm_plex_sans', label: 'IBM Plex Sans', group: 'sans', stack: "'IBM Plex Sans', sans-serif", google: 'IBM Plex Sans' },
  { key: 'dm_sans', label: 'DM Sans', group: 'sans', stack: "'DM Sans', sans-serif", google: 'DM Sans' },
  { key: 'karla', label: 'Karla', group: 'sans', stack: "'Karla', sans-serif", google: 'Karla' },
  { key: 'manrope', label: 'Manrope', group: 'sans', stack: "'Manrope', sans-serif", google: 'Manrope' },
  { key: 'outfit', label: 'Outfit', group: 'sans', stack: "'Outfit', sans-serif", google: 'Outfit' },
  { key: 'plus_jakarta_sans', label: 'Plus Jakarta Sans', group: 'sans', stack: "'Plus Jakarta Sans', sans-serif", google: 'Plus Jakarta Sans' },
  { key: 'mulish', label: 'Mulish', group: 'sans', stack: "'Mulish', sans-serif", google: 'Mulish' },
  { key: 'rubik', label: 'Rubik', group: 'sans', stack: "'Rubik', sans-serif", google: 'Rubik' },
  { key: 'noto_sans', label: 'Noto Sans', group: 'sans', stack: "'Noto Sans', sans-serif", google: 'Noto Sans' },
  { key: 'barlow', label: 'Barlow', group: 'sans', stack: "'Barlow', sans-serif", google: 'Barlow' },
  { key: 'figtree', label: 'Figtree', group: 'sans', stack: "'Figtree', sans-serif", google: 'Figtree' },
  { key: 'urbanist', label: 'Urbanist', group: 'sans', stack: "'Urbanist', sans-serif", google: 'Urbanist' },
  { key: 'archivo', label: 'Archivo', group: 'sans', stack: "'Archivo', sans-serif", google: 'Archivo' },
  { key: 'public_sans', label: 'Public Sans', group: 'sans', stack: "'Public Sans', sans-serif", google: 'Public Sans' },
  { key: 'josefin_sans', label: 'Josefin Sans', group: 'sans', stack: "'Josefin Sans', sans-serif", google: 'Josefin Sans' },
  { key: 'cabin', label: 'Cabin', group: 'sans', stack: "'Cabin', sans-serif", google: 'Cabin' },
  { key: 'titillium_web', label: 'Titillium Web', group: 'sans', stack: "'Titillium Web', sans-serif", google: 'Titillium Web' },
  { key: 'oswald', label: 'Oswald', group: 'sans', stack: "'Oswald', sans-serif", google: 'Oswald' },
  { key: 'source_serif', label: 'Source Serif 4', group: 'serif', stack: "'Source Serif 4', Georgia, serif", google: 'Source Serif 4' },
  { key: 'merriweather', label: 'Merriweather', group: 'serif', stack: "'Merriweather', Georgia, serif", google: 'Merriweather' },
  { key: 'playfair_display', label: 'Playfair Display', group: 'serif', stack: "'Playfair Display', Georgia, serif", google: 'Playfair Display' },
  { key: 'libre_baskerville', label: 'Libre Baskerville', group: 'serif', stack: "'Libre Baskerville', Georgia, serif", google: 'Libre Baskerville' },
  { key: 'lora', label: 'Lora', group: 'serif', stack: "'Lora', Georgia, serif", google: 'Lora' },
  { key: 'crimson_pro', label: 'Crimson Pro', group: 'serif', stack: "'Crimson Pro', Georgia, serif", google: 'Crimson Pro' },
  { key: 'eb_garamond', label: 'EB Garamond', group: 'serif', stack: "'EB Garamond', Garamond, serif", google: 'EB Garamond' },
  { key: 'literata', label: 'Literata', group: 'serif', stack: "'Literata', Georgia, serif", google: 'Literata' },
  { key: 'pt_serif', label: 'PT Serif', group: 'serif', stack: "'PT Serif', Georgia, serif", google: 'PT Serif' },
  { key: 'spectral', label: 'Spectral', group: 'serif', stack: "'Spectral', Georgia, serif", google: 'Spectral' },
  { key: 'cormorant_garamond', label: 'Cormorant Garamond', group: 'serif', stack: "'Cormorant Garamond', Garamond, serif", google: 'Cormorant Garamond' },
  { key: 'newsreader', label: 'Newsreader', group: 'serif', stack: "'Newsreader', Georgia, serif", google: 'Newsreader' },
  { key: 'noto_serif', label: 'Noto Serif', group: 'serif', stack: "'Noto Serif', Georgia, serif", google: 'Noto Serif' },
  { key: 'ibm_plex_serif', label: 'IBM Plex Serif', group: 'serif', stack: "'IBM Plex Serif', Georgia, serif", google: 'IBM Plex Serif' },
  { key: 'libre_caslon_text', label: 'Libre Caslon Text', group: 'serif', stack: "'Libre Caslon Text', 'Palatino Linotype', serif", google: 'Libre Caslon Text' },
  { key: 'cardo', label: 'Cardo', group: 'serif', stack: "'Cardo', Georgia, serif", google: 'Cardo' },
  { key: 'fraunces', label: 'Fraunces', group: 'serif', stack: "'Fraunces', Georgia, serif", google: 'Fraunces' },
  { key: 'bitter', label: 'Bitter', group: 'serif', stack: "'Bitter', Georgia, serif", google: 'Bitter' },
  { key: 'vollkorn', label: 'Vollkorn', group: 'serif', stack: "'Vollkorn', Georgia, serif", google: 'Vollkorn' },
  { key: 'georgia', label: 'Georgia', group: 'system', stack: "Georgia, 'Times New Roman', serif" },
  { key: 'times', label: 'Times New Roman', group: 'system', stack: "'Times New Roman', Times, serif" },
  { key: 'garamond', label: 'Garamond', group: 'system', stack: "Garamond, 'Palatino Linotype', serif" },
  { key: 'palatino', label: 'Palatino', group: 'system', stack: "'Palatino Linotype', Palatino, serif" },
  { key: 'arial', label: 'Arial', group: 'system', stack: 'Arial, Helvetica, sans-serif' },
  { key: 'verdana', label: 'Verdana', group: 'system', stack: 'Verdana, Geneva, sans-serif' },
  { key: 'tahoma', label: 'Tahoma', group: 'system', stack: 'Tahoma, Geneva, sans-serif' },
  { key: 'trebuchet', label: 'Trebuchet MS', group: 'system', stack: "'Trebuchet MS', Helvetica, sans-serif" },
  { key: 'courier', label: 'Courier New', group: 'system', stack: "'Courier New', Courier, monospace" },
]

export type PrintFontKey = (typeof PRINT_FONTS)[number]['key']

export const PRINT_FONT_STACK: Record<string, string> = Object.fromEntries(
  PRINT_FONTS.map((font) => [font.key, font.stack]),
)

export const PRINT_FONT_KEYS = PRINT_FONTS.map((font) => font.key)

const injectedKeys = new Set<string>()

function googleHref(family: string): string {
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;600;700&display=swap`
}

export function printFontFamilyName(fontKey: string): string {
  const def = PRINT_FONTS.find((font) => font.key === fontKey)
  const raw = def?.stack.split(',')[0]?.trim() ?? 'Geist'
  return raw.replace(/^['"]|['"]$/g, '')
}

/** Load only the selected face. A single mega stylesheet blocks PNG/PDF capture. */
export function ensurePrintFonts(fontKey?: string): void {
  if (typeof document === 'undefined') return

  document.getElementById('print-google-fonts')?.remove()

  const keys = fontKey ? [fontKey] : []
  for (const key of keys) {
    const def = PRINT_FONTS.find((font) => font.key === key)
    if (!def?.google || injectedKeys.has(key)) continue
    if (document.getElementById(`print-google-font-${key}`)) {
      injectedKeys.add(key)
      continue
    }
    injectedKeys.add(key)
    const link = document.createElement('link')
    link.id = `print-google-font-${key}`
    link.rel = 'stylesheet'
    link.href = googleHref(def.google)
    document.head.appendChild(link)
  }
}

export async function waitForPrintFont(fontKey = 'geist', ms = 3000): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts?.load) return
  ensurePrintFonts(fontKey)
  const family = printFontFamilyName(fontKey)
  const load = Promise.all([
    document.fonts.load(`400 16px "${family}"`),
    document.fonts.load(`600 16px "${family}"`),
    document.fonts.load(`700 16px "${family}"`),
  ]).then(() => undefined)
  try {
    await Promise.race([load, new Promise<void>((resolve) => window.setTimeout(resolve, ms))])
  } catch {
    /* system faces and slow Google loads must not block PNG/PDF */
  }
}
