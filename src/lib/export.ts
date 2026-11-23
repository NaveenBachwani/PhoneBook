import { generateVCard, splitForExport } from './vcard/generate'
import { EXPORT_MAX_CONTACTS, EXPORT_MAX_BYTES } from './constants'
import type { Contact } from './vcard/types'

export function downloadBlob(content: string, filename: string, mime = 'text/plain'): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function vcfFileNames(contacts: Contact[]): string[] {
  const parts = splitForExport(contacts, EXPORT_MAX_CONTACTS)
  return parts.map((_, i) => (parts.length === 1 ? 'contacts-cleaned.vcf' : `contacts-cleaned-${i + 1}.vcf`))
}

export function downloadVcfFiles(contacts: Contact[]): number {
  const parts = splitForExport(contacts, EXPORT_MAX_CONTACTS)
  const names = vcfFileNames(contacts)
  parts.forEach((part, i) => {
    downloadBlob(generateVCard(part), names[i], 'text/vcard')
  })
  return parts.length
}

export function csvField(value: string): string {
  if (/[",\n\r]/.test(value)) return '"' + value.replace(/"/g, '""') + '"'
  return value
}

export function toCsv(contacts: Contact[]): string {
  const header = ['Name', 'Organization', 'Title', 'Emails', 'Phones', 'Address', 'Categories', 'Notes']
  const rows = contacts.map((c) => {
    const address = c.addresses
      .map((a) => a.components.filter(Boolean).join(', '))
      .filter(Boolean)
      .join(' | ')
    return [
      c.fn,
      c.orgComponents?.filter(Boolean).join('; ') ?? '',
      c.title ?? '',
      c.emails.map((e) => e.value).join('; '),
      c.phones.map((p) => p.value).join('; '),
      address,
      c.categories.join('; '),
      c.notes.join('\n')
    ]
      .map(csvField)
      .join(',')
  })
  return [header.join(','), ...rows].join('\r\n') + '\r\n'
}

export function downloadCsv(contacts: Contact[]): void {
  downloadBlob(toCsv(contacts), 'contacts-cleaned.csv', 'text/csv')
}

export function oversizedFiles(contacts: Contact[]): boolean {
  const vcfs = splitForExport(contacts, EXPORT_MAX_CONTACTS).map((p) => generateVCard(p))
  return vcfs.some((v) => new TextEncoder().encode(v).length > EXPORT_MAX_BYTES)
}
