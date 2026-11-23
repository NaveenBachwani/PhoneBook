import type { Contact, ContactPoint } from './types'
import { escapeText } from './parse'

const encoder = new TextEncoder()

function foldLine(line: string): string[] {
  const segments: string[] = []
  let current = ''
  let currentBytes = 0
  for (const ch of line) {
    const chBytes = encoder.encode(ch).length
    const budget = segments.length === 0 ? 75 : 74
    if (currentBytes + chBytes > budget && current) {
      segments.push(current)
      current = ''
      currentBytes = 0
    }
    current += ch
    currentBytes += chBytes
  }
  segments.push(current)
  return segments.map((s, i) => (i === 0 ? s : ' ' + s))
}

function emit(name: string, point: ContactPoint): string {
  return point.type ? `${name};TYPE=${point.type}:${escapeText(point.value)}` : `${name}:${escapeText(point.value)}`
}

function generateCard(c: Contact): string {
  const lines: string[] = ['BEGIN:VCARD', 'VERSION:3.0']
  if (c.uidLine) lines.push(c.uidLine)
  lines.push('FN:' + escapeText(c.fn))
  if (c.n) {
    const comps = [c.n.family, c.n.given, c.n.additional, c.n.prefix, c.n.suffix].map((v) =>
      v ? escapeText(v) : ''
    )
    if (comps.some(Boolean)) lines.push('N:' + comps.join(';'))
  }
  if (c.orgComponents && c.orgComponents.some((x) => x.trim())) {
    lines.push('ORG:' + c.orgComponents.map((x) => escapeText(x)).join(';'))
  }
  if (c.title) lines.push('TITLE:' + escapeText(c.title))
  for (const p of c.phones) lines.push(emit('TEL', p))
  for (const p of c.emails) lines.push(emit('EMAIL', p))
  for (const a of c.addresses) {
    const comps = [...a.components]
    while (comps.length < 7) comps.push('')
    const value = comps.map((x) => escapeText(x)).join(';')
    lines.push(a.type ? `ADR;TYPE=${a.type}:${value}` : `ADR:${value}`)
  }
  if (c.bdayLine) lines.push(c.bdayLine)
  if (c.photoLine) lines.push(c.photoLine)
  if (c.categories.length) {
    lines.push('CATEGORIES:' + c.categories.map((x) => escapeText(x)).join(','))
  }
  if (c.notes.length) lines.push('NOTE:' + escapeText(c.notes.join('\n')))
  if (c.revLine) lines.push(c.revLine)
  lines.push(...c.rawLines)
  lines.push('END:VCARD')
  return lines.flatMap(foldLine).join('\r\n') + '\r\n'
}

export function generateVCard(contacts: Contact[]): string {
  return contacts.map(generateCard).join('')
}

export function splitForExport(contacts: Contact[], maxContacts = 3000): Contact[][] {
  if (contacts.length === 0) return []
  const chunks: Contact[][] = []
  for (let i = 0; i < contacts.length; i += maxContacts) {
    chunks.push(contacts.slice(i, i + maxContacts))
  }
  return chunks
}
