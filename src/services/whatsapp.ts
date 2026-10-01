import type { SendWhatsAppDocumentPayload, SendWhatsAppResponse, WhatsAppState } from '../types/whatsapp'
import { api, unwrap } from './api'

export function getWhatsAppStatus(): Promise<WhatsAppState> {
  return unwrap<WhatsAppState>(api.get('/app/whatsapp/status'))
}

/** Start linking. `fresh` throws the old session away so a new QR code is made. */
export function initWhatsAppInstance(fresh = false): Promise<WhatsAppState> {
  return unwrap<WhatsAppState>(api.post('/app/whatsapp/init', fresh ? { fresh: true } : {}))
}

export function logoutWhatsAppInstance(): Promise<WhatsAppState> {
  return unwrap<WhatsAppState>(api.post('/app/whatsapp/logout'))
}

export function updateWhatsAppSettings(input: {
  auto_send?: boolean
  message_template?: string | null
}): Promise<{ auto_send: boolean; message_template: string | null }> {
  return unwrap<{ auto_send: boolean; message_template: string | null }>(api.patch('/app/whatsapp/settings', input))
}

export function sendWhatsAppDocument(payload: SendWhatsAppDocumentPayload): Promise<SendWhatsAppResponse> {
  return unwrap<SendWhatsAppResponse>(api.post('/app/whatsapp/send-document', payload))
}

/** With no number the test goes to the linked WhatsApp itself. */
export function sendWhatsAppTest(phone?: string, message?: string): Promise<{ recipient: string }> {
  return unwrap<{ recipient: string }>(api.post('/app/whatsapp/test', { phone, message }))
}

