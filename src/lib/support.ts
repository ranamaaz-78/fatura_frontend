const whatsapp = import.meta.env.VITE_SUPPORT_WHATSAPP ?? ''
const email = import.meta.env.VITE_SUPPORT_EMAIL ?? ''

export const supportEmail = email

/** wa.me only accepts digits, so the stored E.164 number has to be stripped. */
export function supportWhatsappUrl(message?: string): string | null {
  const digits = whatsapp.replace(/\D/g, '')
  if (digits === '') return null

  const query = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${digits}${query}`
}
