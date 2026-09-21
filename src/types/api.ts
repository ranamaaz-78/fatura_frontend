export type ApiSuccess<T> = {
  success: true
  message: string
  data: T
}

export type ApiFailure = {
  success: false
  message: string
  data: unknown
  errors?: Record<string, string[] | string>
  code?: string
  support?: { email: string; whatsapp: string }
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure

export type HealthPayload = {
  status: string
  app: string
  time: string
}
