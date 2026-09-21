import type { AuthUser, SessionPayload, UserRole } from '../types/module01'
import { api, unwrap } from './api'

export type Credentials = { email: string; password: string }

export type AuthResult = {
  token: string
  user: AuthUser
  role: UserRole
}

export function login(credentials: Credentials): Promise<AuthResult> {
  return unwrap<AuthResult>(api.post('/auth/login', credentials))
}

export function logout(): Promise<unknown> {
  return unwrap(api.post('/auth/logout'))
}

export function getSession(): Promise<SessionPayload> {
  return unwrap<SessionPayload>(api.get('/auth/me'))
}

export type SetPasswordInput = {
  token: string
  email: string
  password: string
  password_confirmation: string
}

export function setPassword(input: SetPasswordInput): Promise<AuthResult> {
  return unwrap<AuthResult>(api.post('/auth/set-password', input))
}

export function forgotPassword(email: string): Promise<unknown> {
  return unwrap(api.post('/auth/forgot-password', { email }))
}
