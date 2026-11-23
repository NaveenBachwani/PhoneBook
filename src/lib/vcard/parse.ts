import type { Contact, ContactName, ContactPoint, ParseError, ParseResult } from './types'

interface RawProp {
  group?: string
  name: string
  nameRaw: string
  paramText: string
  value: string
}

interface ParsedLine {
  line: number
  text: string
}

function normalizeNewlines(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

export function unfold(text: string): ParsedLine[] {
  const physical = normalizeNewlines(text).split('\n')
  const out: ParsedLine[] = []
  for (let i = 0; i < physical.length; i++) {
    const raw = physical[i]
    const line = { line: i + 1, text: raw }
    const prev = out.length ? out[out.length - 1] : undefined
    if ((raw.startsWith(' ') || raw.startsWith('\t')) && prev) {
      const cont = raw.slice(1)
      if (prev.text.endsWith('=') && isQpEncoded(prev.text)) {
        prev.text = prev.text.slice(0, -1) + cont
      } else {
        prev.text = prev.text + cont
      }
      continue
    }
    if (prev && prev.text.endsWith('=') && isQpEncoded(prev.text)) {
      const cont = raw.startsWith(' ') || raw.startsWith('\t') ? raw.slice(1) : raw
      prev.text = prev.text.slice(0, -1) + cont
      continue
    }
    out.push(line)
  }
  return out
}

function isQpEncoded(propLine: string): boolean {
  const colon = propLine.indexOf(':')
  const head = colon === -1 ? propLine : propLine.slice(0, colon)
  return /ENCODING\s*=\s*QUOTED-PRINTABLE/i.test(head)
}

function splitPropLine(text: string): RawProp | undefined {
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') inQuotes = !inQuotes
    else if (ch === ':' && !inQuotes) {
      const head = text.slice(0, i)
      const value = text.slice(i + 1)
      const dot = head.indexOf('.')
      let group: string | undefined
      let rest = head
      if (dot !== -1 && /^[A-Za-z0-9-]+$/.test(head.slice(0, dot))) {
        group = head.slice(0, dot)
        rest = head.slice(dot + 1)
      }
      const semi = rest.indexOf(';')
      const name = (semi === -1 ? rest : rest.slice(0, semi)).trim()
      const paramText = semi === -1 ? '' : rest.slice(semi)
      if (!/^[A-Za-z0-9-]+$/.test(name)) return undefined
      return { group, name: name.toUpperCase(), nameRaw: name, paramText, value }
    }
  }
  return undefined
}

function paramValues(prop: RawProp, key: string): string[] {
  const out: string[] = []
  const parts = prop.paramText.split(';').slice(1)
  for (const part of parts) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    const k = part.slice(0, eq).trim().toUpperCase()
    if (k !== key) continue
    const v = part.slice(eq + 1).replace(/^"|"$/g, '')
    for (const item of v.split(',')) out.push(item.trim().toUpperCase())
  }
  return out
}

function bareParams(prop: RawProp): string[] {
  const out: string[] = []
  const parts = prop.paramText.split(';').slice(1)
  for (const part of parts) {
    if (part.includes('=')) continue
    const v = part.replace(/^"|"$/g, '').trim().toUpperCase()
    if (v) out.push(v)
  }
  return out
}

function isQp(prop: RawProp): boolean {
  if (paramValues(prop, 'ENCODING').includes('QUOTED-PRINTABLE')) return true
  return bareParams(prop).includes('QUOTED-PRINTABLE')
}

function decodeQp(value: string, charset: string): string {
  const bytes: number[] = []
  let rest = value
  while (rest.length) {
    const m = /^=([0-9A-Fa-f]{2})/.exec(rest)
    if (m) {
      bytes.push(parseInt(m[1], 16))
      rest = rest.slice(3)
      continue
    }
    const ch = rest.charCodeAt(0)
    bytes.push(ch > 0xff ? 0x3d : ch)
    rest = rest.slice(1)
  }
  try {
    return new TextDecoder(charset, { fatal: false }).decode(new Uint8Array(bytes))
  } catch {
    return new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(bytes))
  }
}

function qpCharset(prop: RawProp): string {
  const cs = paramValues(prop, 'CHARSET')[0]
  return cs || 'utf-8'
}

export function unescapeText(s: string): string {
  let out = ''
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (ch !== '\\') {
      out += ch
      continue
    }
    const next = s[++i]
    if (next === undefined) break
    if (next === 'n' || next === 'N') out += '\n'
    else if (next === '\\' || next === ';' || next === ',') out += next
    else out += next
  }
  return out
}

export function escapeText(s: string): string {
  let out = ''
  for (const ch of s) {
    if (ch === '\\') out += '\\\\'
    else if (ch === ';') out += '\\;'
    else if (ch === ',') out += '\\,'
    else if (ch === '\n') out += '\\n'
    else if (ch === '\r') continue
    else out += ch
  }
  return out
}

export function splitUnescaped(s: string, sep: string): string[] {
  const out: string[] = []
  let current = ''
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (ch === '\\' && i + 1 < s.length) {
      current += ch + s[i + 1]
      i++
      continue
    }
    if (ch === sep) {
      out.push(current)
      current = ''
      continue
    }
    current += ch
  }
  out.push(current)
  return out
}

function pointType(prop: RawProp): string | undefined {
  const types = [...paramValues(prop, 'TYPE'), ...bareParams(prop)].filter(
    (t) => t !== 'QUOTED-PRINTABLE'
  )
  return types.length ? types.join(',') : undefined
}

function propLine(prop: RawProp): string {
  const group = prop.group ? prop.group + '.' : ''
  return group + prop.nameRaw + prop.paramText + ':' + prop.value
}

function parseContact(props: (RawProp & { line: number })[], errors: ParseError[]): Contact {
  const contact: Contact = {
    id: randomId(),
    fn: '',
    emails: [],
    phones: [],
    addresses: [],
    notes: [],
    categories: [],
    rawLines: []
  }
  let hasN = false
  for (const prop of props) {
    try {
      switch (prop.name) {
        case 'FN': {
          if (!contact.fn) contact.fn = unescapeText(decodeIfQp(prop))
          break
        }
        case 'N': {
          if (hasN) break
          hasN = true
          const parts = splitUnescaped(decodeIfQp(prop), ';')
          const n: ContactName = {
            family: parts[0] ? unescapeText(parts[0]) : undefined,
            given: parts[1] ? unescapeText(parts[1]) : undefined,
            additional: parts[2] ? unescapeText(parts[2]) : undefined,
            prefix: parts[3] ? unescapeText(parts[3]) : undefined,
            suffix: parts[4] ? unescapeText(parts[4]) : undefined
          }
          if (n.family || n.given || n.additional || n.prefix || n.suffix) contact.n = n
          break
        }
        case 'ORG': {
          if (!contact.orgComponents) {
            contact.orgComponents = splitUnescaped(decodeIfQp(prop), ';').map((c) => unescapeText(c))
          }
          break
        }
        case 'TITLE': {
          if (!contact.title) contact.title = unescapeText(decodeIfQp(prop))
          break
        }
        case 'EMAIL': {
          const p: ContactPoint = { value: unescapeText(decodeIfQp(prop)) }
          const t = pointType(prop)
          if (t) p.type = t
          if (p.value) contact.emails.push(p)
          break
        }
        case 'TEL': {
          const p: ContactPoint = { value: unescapeText(decodeIfQp(prop)) }
          const t = pointType(prop)
          if (t) p.type = t
          if (p.value) contact.phones.push(p)
          break
        }
        case 'ADR': {
          const comps = splitUnescaped(decodeIfQp(prop), ';').map((c) => unescapeText(c))
          if (comps.some((c) => c.trim())) {
            contact.addresses.push({ type: pointType(prop), components: comps })
          }
          break
        }
        case 'NOTE': {
          const note = unescapeText(decodeIfQp(prop))
          if (note) contact.notes.push(note)
          break
        }
        case 'CATEGORIES': {
          for (const c of splitUnescaped(decodeIfQp(prop), ',')) {
            const v = unescapeText(c).trim()
            if (v) contact.categories.push(v)
          }
          break
        }
        case 'BDAY': {
          if (!contact.bdayLine) contact.bdayLine = propLine(prop)
          break
        }
        case 'PHOTO': {
          if (!contact.photoLine) contact.photoLine = propLine(prop)
          break
        }
        case 'UID': {
          if (!contact.uidLine) contact.uidLine = propLine(prop)
          break
        }
        case 'REV': {
          if (!contact.revLine) contact.revLine = propLine(prop)
          break
        }
        case 'VERSION':
        case 'BEGIN':
        case 'END':
          break
        default:
          contact.rawLines.push(prop.name === 'X-UNPARSED' ? prop.value : propLine(prop))
      }
    } catch (err) {
      errors.push({ line: prop.line, message: `Failed to parse ${prop.name}: ${String(err)}` })
      contact.rawLines.push(propLine(prop))
    }
  }
  if (!contact.fn) {
    const n = contact.n
    const derived = [n?.prefix, n?.given, n?.additional, n?.family, n?.suffix]
      .filter(Boolean)
      .join(' ')
      .trim()
    contact.fn = derived || contact.emails[0]?.value || 'Unnamed'
  }
  return contact
}

function decodeIfQp(prop: RawProp & { line: number }): string {
  return isQp(prop) ? decodeQp(prop.value, qpCharset(prop)) : prop.value
}

export function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function parseVCard(text: string): ParseResult {
  const errors: ParseError[] = []
  const contacts: Contact[] = []
  let current: (RawProp & { line: number })[] | undefined
  for (const { line, text: text2 } of unfold(text)) {
    const trimmed = text2.trim()
    if (!trimmed) continue
    const upper = trimmed.toUpperCase()
    if (upper === 'BEGIN:VCARD') {
      if (current) {
        errors.push({ line, message: 'Nested BEGIN:VCARD — previous card had no END, parsed anyway' })
        contacts.push(parseContact(current, errors))
      }
      current = []
      continue
    }
    if (upper === 'END:VCARD') {
      if (current) contacts.push(parseContact(current, errors))
      else errors.push({ line, message: 'END:VCARD without BEGIN' })
      current = undefined
      continue
    }
    if (!current) continue
    const prop = splitPropLine(trimmed)
    if (!prop) {
      errors.push({ line, message: 'Unrecognized line — preserved verbatim' })
      current.push({ group: undefined, name: 'X-UNPARSED', nameRaw: 'X-UNPARSED', paramText: '', value: trimmed, line })
      continue
    }
    current.push({ ...prop, line })
  }
  if (current) {
    errors.push({ line: 0, message: 'Card missing END:VCARD — parsed anyway' })
    contacts.push(parseContact(current, errors))
  }
  return { contacts, errors }
}
