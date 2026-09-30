import type { SendWhatsAppDocumentPayload, SendWhatsAppResponse, WhatsAppState } from '../types/whatsapp'
import { api, unwrap } from './api'

export function getWhatsAppStatus(): Promise<WhatsAppState> {
  return unwrap<WhatsAppState>(api.get('/app/whatsapp/status'))
}

export function initWhatsAppInstance(): Promise<WhatsAppState> {
  return unwrap<WhatsAppState>(api.post('/app/whatsapp/init'))
}

export function logoutWhatsAppInstance(): Promise<void> {
  return unwrap<void>(api.post('/app/whatsapp/logout'))
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

export function sendWhatsAppTest(phone: string, message?: string): Promise<{ success: boolean }> {
  return unwrap<{ success: boolean }>(api.post('/app/whatsapp/test', { phone, message }))
}

