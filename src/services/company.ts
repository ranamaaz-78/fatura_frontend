import type { Company } from '../types/module01'
import { api, unwrap } from './api'

export type CompanyDetailsInput = {
  name: string
  email: string
  phone: string | null
  whatsapp: string | null
  address: string | null
  city: string | null
  country: string | null
  currency: string
}

export function getCompany(): Promise<Company> {
  return unwrap<Company>(api.get('/app/company'))
}

export function updateCompany(input: CompanyDetailsInput): Promise<Company> {
  return unwrap<Company>(api.patch('/app/company', input))
}
