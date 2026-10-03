import { intlLocale } from '../i18n'

const CODES = [
  'EUR', 'USD', 'GBP', 'PKR', 'AED', 'SAR', 'INR', 'MAD', 'CHF', 'CAD', 'AUD',
  'MXN', 'BRL', 'TRY', 'EGP', 'QAR', 'KWD', 'OMR', 'BHD', 'BDT', 'NGN',
] as const

export type CompanyCurrency = (typeof CODES)[number]

const names = new Intl.DisplayNames([intlLocale()], { type: 'currency' })

/** Each currency named in the current language ("Euro", "Dólar estadounidense"). */
export const COMPANY_CURRENCIES: { code: CompanyCurrency; label: string }[] = CODES.map((code) => ({
  code,
  label: names.of(code) ?? code,
}))
