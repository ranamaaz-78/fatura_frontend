import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js'
import type { SearchableSelectOption } from '../components/ui/SearchableSelect'

export type Country = { code: CountryCode; name: string; dial: string }

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' })

/** Every country libphonenumber knows, A to Z, each with its dialling code ("+92"). */
export const COUNTRIES: Country[] = getCountries()
  .map((code) => ({
    code,
    name: regionNames.of(code) ?? code,
    dial: `+${getCountryCallingCode(code)}`,
  }))
  .sort((a, b) => a.name.localeCompare(b.name))

/** Several countries share a code. This picks the one people mean when they choose the code. */
const PRIMARY_FOR_DIAL: Record<string, CountryCode> = {
  '+1': 'US',
  '+7': 'RU',
  '+39': 'IT',
  '+44': 'GB',
  '+47': 'NO',
  '+61': 'AU',
  '+212': 'MA',
  '+262': 'RE',
  '+358': 'FI',
  '+590': 'GP',
  '+599': 'CW',
}

export const DEFAULT_COUNTRY: Country = COUNTRIES.find((country) => country.code === 'ES') ?? COUNTRIES[0]

export function countryByName(name: string | undefined): Country | undefined {
  return COUNTRIES.find((country) => country.name === name)
}

/** The country to assume for a dialling code, keeping the current one if it already uses it. */
export function countryForDial(dial: string, current?: string): Country | undefined {
  const sameDial = COUNTRIES.filter((country) => country.dial === dial)
  const kept = sameDial.find((country) => country.name === current)
  if (kept) return kept
  return sameDial.find((country) => country.code === PRIMARY_FOR_DIAL[dial]) ?? sameDial[0]
}

/** One row per dialling code. Searchable by any country that uses it. */
export const DIAL_OPTIONS: SearchableSelectOption[] = (() => {
  const groups = new Map<string, Country[]>()
  for (const country of COUNTRIES) {
    groups.set(country.dial, [...(groups.get(country.dial) ?? []), country])
  }

  return [...groups.entries()]
    .sort((a, b) => Number(a[0].slice(1)) - Number(b[0].slice(1)))
    .map(([dial, list]) => {
      const primary = list.find((country) => country.code === PRIMARY_FOR_DIAL[dial]) ?? list[0]
      const extra = list.length > 1 ? ` +${list.length - 1}` : ''
      return {
        value: dial,
        label: `${dial}  ${primary.name}${extra}`,
        triggerLabel: dial,
        keywords: list.map((country) => country.name).join(' '),
      }
    })
})()

/** Digits only, no leading zero: what follows the dialling code. */
export function localDigits(value: string): string {
  return value.replace(/\D+/g, '').replace(/^0+/, '')
}

/**
 * Reads a number typed or pasted with a "+" (e.g. "+971 50 123 4567") and works out
 * its dialling code, country and local part. Null when it does not look international.
 */
export function detectFromInternational(value: string): { dial: string; country: Country; local: string } | null {
  if (!value.trim().startsWith('+')) return null

  const parsed = parsePhoneNumberFromString(value)
  if (!parsed) return null

  const dial = `+${parsed.countryCallingCode}`
  const country =
    COUNTRIES.find((entry) => entry.code === parsed.country) ?? countryForDial(dial)
  if (!country) return null

  return { dial, country, local: parsed.nationalNumber }
}

/** True when dial + local digits could be a real number for that dialling code. */
export function isPossibleNumber(dial: string, local: string): boolean {
  const parsed = parsePhoneNumberFromString(`${dial}${localDigits(local)}`)
  return Boolean(parsed?.isPossible())
}

/** True when a full international number ("+971 50 123 4567") could be real. */
export function isPossibleInternational(value: string): boolean {
  return Boolean(parsePhoneNumberFromString(value)?.isPossible())
}
