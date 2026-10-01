import type { Company } from '../types/module01'
import { api, unwrap } from './api'

export type CompanyDetailsInput = {
  name: string
  email: string
  tax_id: string
  phone: string
  whatsapp: string
  address: string
  city: string
  postal_code: string
  country: string
  currency: string
}

export function getCompany(): Promise<Company> {
  return unwrap<Company>(api.get('/app/company'))
}

export function updateCompany(input: CompanyDetailsInput): Promise<Company> {
  return unwrap<Company>(api.patch('/app/company', input))
}
