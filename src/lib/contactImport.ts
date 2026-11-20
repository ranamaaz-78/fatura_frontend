import * as XLSX from 'xlsx'
import { t } from '../i18n'
import { downloadFileName, fileDate } from './fileName'

/*
 * Bringing clients or suppliers in from a spreadsheet: the same steps as the product import (upload, confirm the
 * columns, preview and fix, insert), with the fields of a client or of a supplier.
 */

export type ContactKind = 'customer' | 'supplier'

export type ContactField = 'name' | 'company_name' | 'phone' | 'email' | 'nif' | 'address' | 'remarks'

/** The fields each kind has. A supplier has no address. */
export const CONTACT_FIELDS: Record<ContactKind, ContactField[]> = {
  customer: ['name', 'company_name', 'phone', 'email', 'nif', 'address', 'remarks'],
  supplier: ['name', 'company_name', 'phone', 'email', 'nif', 'remarks'],
}

export const REQUIRED_CONTACT_FIELDS: ContactField[] = ['name']

/** Which sheet column feeds each field (null: not in the file). */
export type ContactMap = Record<ContactField, number | null>

/** One row as text in the preview grid, before it is checked and sent. */
export type ContactGridRow = Record<ContactField, string>

/** One row as the server takes it. */
export type ContactImportRow = Record<ContactField, string | null>

export function fieldLabel(field: ContactField): string {
  switch (field) {
    case 'name':
      return t('sales.clientName', 'Name')
    case 'company_name':
      return t('sales.clientCompany', 'Company name')
    case 'phone':
      return t('sales.phone', 'Telephone')
    case 'email':
      return t('sales.clientEmail', 'Email')
    case 'nif':
      return t('sales.taxId', 'N.I.F/N.I.E')
    case 'address':
      return t('sales.clientAddress', 'Address')
    case 'remarks':
      return t('clients.remarks', 'Remarks')
  }
}

/**
 * The headings of the demo sheet in both languages whatever language the app is in ("Name / Nombre"): the people who
 * fill it in may read either, and the importer knows each of them.
 */
const SHEET_LABELS: Record<ContactField, { en: string; es: string }> = {
  name: { en: 'Name', es: 'Nombre' },
  company_name: { en: 'Company name', es: 'Empresa' },
  phone: { en: 'Phone', es: 'Teléfono' },
  email: { en: 'Email', es: 'Correo electrónico' },
  nif: { en: 'N.I.F/N.I.E', es: 'N.I.F/N.I.E' },
  address: { en: 'Address', es: 'Dirección' },
  remarks: { en: 'Remarks', es: 'Observaciones' },
}

export function sheetHeader(field: ContactField): string {
  const label = SHEET_LABELS[field]
  return label.en === label.es ? label.en : `${label.en} / ${label.es}`
}

/** Other names a sheet may use for each field, in English and Spanish: the lists these businesses keep are often written either way. */
const ALIASES: Record<ContactField, string[]> = {
  email: ['email', 'e-mail', 'correo', 'correo electronico', 'mail'],
  phone: ['phone', 'telephone', 'tel', 'telefono', 'mobile', 'movil', 'cell', 'celular', 'whatsapp'],
  nif: ['nif', 'nie', 'cif', 'nif/nie', 'tax id', 'tax number', 'vat number', 'vat', 'dni'],
  company_name: ['company', 'company name', 'empresa', 'razon social', 'compania', 'business'],
  address: ['address', 'direccion', 'domicilio', 'street', 'calle'],
  remarks: ['remarks', 'notes', 'note', 'observaciones', 'notas', 'comments', 'comentarios'],
  name: ['name', 'nombre', 'full name', 'nombre completo', 'client', 'cliente', 'customer', 'supplier', 'proveedor', 'contact', 'contacto'],
}

/** Specific names are claimed first, so "Company name" is not taken for "Name". */
const MATCH_ORDER: ContactField[] = ['email', 'phone', 'nif', 'company_name', 'address', 'remarks', 'name']

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

export function autoMapContacts(kind: ContactKind, headers: string[]): ContactMap {
  const normalized = headers.map(normalize)
  const used = new Set<number>()
  const map: ContactMap = { name: null, company_name: null, phone: null, email: null, nif: null, address: null, remarks: null }
  const fields = MATCH_ORDER.filter((field) => CONTACT_FIELDS[kind].includes(field))

  function claim(field: ContactField, matches: (header: string, alias: string) => boolean) {
    if (map[field] !== null) return

    for (const alias of [sheetHeader(field), ...ALIASES[field]]) {
      const target = normalize(alias)
      const index = normalized.findIndex((header, position) => !used.has(position) && header !== '' && matches(header, target))
      if (index >= 0) {
        map[field] = index
        used.add(index)
        return
      }
    }
  }

  for (const field of fields) claim(field, (header, alias) => header === alias)
  for (const field of fields) claim(field, (header, alias) => header.includes(alias))

  return map
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** A phone as it is compared: no spaces or dashes, so "612 000-111" and "612000111" are one number. */
function digits(value: string): string {
  return value.replace(/[\s-]+/g, '')
}

/** Problems that keep a row out, in the user's words. The server checks again, and also against what is already saved. */
export function contactProblems(kind: ContactKind, row: ContactGridRow, index: number, all: ContactGridRow[]): string[] {
  const problems: string[] = []

  if (row.name.trim() === '') problems.push(t('contactImport.needName', 'Name is missing'))
  if (row.email.trim() !== '' && !EMAIL.test(row.email.trim())) problems.push(t('contactImport.badEmail', 'Email is not valid'))

  if (kind === 'customer') {
    // One number is one client: the sale screen refuses a second client on a saved number too.
    const phone = digits(row.phone)
    if (phone !== '' && all.some((other, position) => position !== index && digits(other.phone) === phone)) {
      problems.push(t('contactImport.phoneRepeated', 'Phone is repeated in the file'))
    }
  } else {
    // A supplier is found by its name when products are imported, so two of one name would be ambiguous there.
    const name = row.name.trim().toLowerCase()
    if (name !== '' && all.some((other, position) => position !== index && other.name.trim().toLowerCase() === name)) {
      problems.push(t('contactImport.nameRepeated', 'Name is repeated in the file'))
    }
  }

  return problems
}

export function toContactImportRow(kind: ContactKind, row: ContactGridRow): ContactImportRow {
  const value = (field: ContactField) => (CONTACT_FIELDS[kind].includes(field) ? row[field].trim() || null : null)
  return {
    name: row.name.trim(),
    company_name: value('company_name'),
    phone: value('phone'),
    email: value('email'),
    nif: value('nif'),
    address: value('address'),
    remarks: value('remarks'),
  }
}

type Sample = Record<ContactField, string>

/** Three obvious test rows. The phones are made up, so they cannot clash with a real client. */
function samples(kind: ContactKind): Sample[] {
  const note = t('contactImport.demoRowNote', 'Demo row: delete it before importing your real list.')
  if (kind === 'customer') {
    return [
      { name: 'Sample Client 1', company_name: 'Demo Company', phone: '+34 600 000 001', email: 'client1@example.com', nif: '12345678Z', address: 'Calle Ejemplo 1, Madrid', remarks: note },
      { name: 'Sample Client 2', company_name: '', phone: '+34 600 000 002', email: '', nif: '', address: '', remarks: note },
      { name: 'Sample Client 3', company_name: '', phone: '', email: '', nif: '', address: '', remarks: note },
    ]
  }
  return [
    { name: 'Sample Supplier 1 (demo row)', company_name: 'Demo Supplies S.L.', phone: '+34 910 000 001', email: 'supplier1@example.com', nif: 'B12345678', address: '', remarks: note },
    { name: 'Sample Supplier 2 (demo row)', company_name: '', phone: '+34 910 000 002', email: '', nif: '', address: '', remarks: note },
    { name: 'Sample Supplier 3 (demo row)', company_name: '', phone: '', email: '', nif: '', address: '', remarks: note },
  ]
}

function hint(kind: ContactKind, field: ContactField): string {
  switch (field) {
    case 'name':
      return kind === 'customer'
        ? t('contactImport.hintClientName', 'The client\'s name.')
        : t('contactImport.hintSupplierName', 'The supplier\'s name. Two suppliers cannot have the same name.')
    case 'company_name':
      return t('contactImport.hintOptional', 'Optional.')
    case 'phone':
      return kind === 'customer'
        ? t('contactImport.hintClientPhone', 'Optional. A phone number can belong to only one client.')
        : t('contactImport.hintOptional', 'Optional.')
    case 'email':
      return t('contactImport.hintEmail', 'Optional. A valid email address.')
    case 'nif':
      return t('contactImport.hintTaxId', 'Optional. The tax number, N.I.F or N.I.E.')
    case 'address':
      return t('contactImport.hintOptional', 'Optional.')
    case 'remarks':
      return t('contactImport.hintRemarks', 'Optional. A private note, never printed.')
  }
}

const COLUMN_WIDTH: Record<ContactField, number> = { name: 36, company_name: 28, phone: 22, email: 32, nif: 18, address: 38, remarks: 40 }

/**
 * Builds the template workbook: sheet 1 is exactly what the importer reads (header row + 3 sample rows), sheet 2
 * explains each column.
 */
export function downloadContactDemoSheet(kind: ContactKind, companyName?: string | null): void {
  const fields = CONTACT_FIELDS[kind]
  const headers = fields.map((field) => sheetHeader(field))
  const body = samples(kind).map((sample) => fields.map((field) => sample[field]))

  const contacts = XLSX.utils.aoa_to_sheet([headers, ...body])
  contacts['!cols'] = fields.map((field) => ({ wch: COLUMN_WIDTH[field] }))

  const guide = XLSX.utils.aoa_to_sheet([
    [t('import.demoColumn', 'Column'), t('import.demoRequired', 'Required'), t('import.demoHelp', 'How to fill it')],
    ...fields.map((field) => [
      sheetHeader(field),
      REQUIRED_CONTACT_FIELDS.includes(field) ? t('common.yes', 'Yes') : t('common.no', 'No'),
      hint(kind, field),
    ]),
    [],
    [
      kind === 'customer'
        ? t('contactImport.demoNoteClients', 'Keep the Clients sheet first, delete the 3 sample rows, then add your own clients.')
        : t('contactImport.demoNoteSuppliers', 'Keep the Suppliers sheet first, delete the 3 sample rows, then add your own suppliers.'),
    ],
  ])
  guide['!cols'] = [{ wch: 30 }, { wch: 10 }, { wch: 70 }]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, contacts, kind === 'customer' ? t('contactImport.sheetClients', 'Clients') : t('contactImport.sheetSuppliers', 'Suppliers'))
  XLSX.utils.book_append_sheet(workbook, guide, t('import.demoGuideName', 'How to fill'))

  // Company - Client import template - 2026-11-19.xlsx
  const name = kind === 'customer' ? t('contactImport.templateClients', 'Client import template') : t('contactImport.templateSuppliers', 'Supplier import template')
  XLSX.writeFile(workbook, downloadFileName([companyName, name, fileDate()], 'xlsx'))
}
