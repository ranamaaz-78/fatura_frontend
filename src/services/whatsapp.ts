import type { WhatsAppSettings } from '../types/whatsapp'
import { api, unwrap } from './api'

export function getWhatsAppSettings(): Promise<WhatsAppSettings> {
  return unwrap<WhatsAppSettings>(api.get('/app/whatsapp/settings'))
}

export function updateWhatsAppSettings(input: { message_template: string | null }): Promise<WhatsAppSettings> {
  return unwrap<WhatsAppSettings>(api.patch('/app/whatsapp/settings', input))
}
