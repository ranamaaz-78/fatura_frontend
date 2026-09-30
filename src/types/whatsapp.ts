export type WhatsAppStatus = 'disconnected' | 'connecting' | 'qrcode' | 'connected' | 'service_offline'

export type WhatsAppState = {
  instance_name: string | null
  status: WhatsAppStatus
  connected_phone: string | null
  connected_name: string | null
  qrcode: string | null
  auto_send: boolean
  message_template: string | null
  service_alive?: boolean
}

export type SendWhatsAppDocumentPayload = {
  sale_id: number
  number?: string
  fileBase64: string
  filename?: string
  caption?: string
}

export type SendWhatsAppResponse = {
  recipient: string
  messageId?: string
  filename: string
}

