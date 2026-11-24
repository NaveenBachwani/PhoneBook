import { describe, expect, it } from 'vitest'
import { parseVCard } from './parse'
import { generateVCard } from './generate'
import { dedupeContacts } from './dedupe'
import { buildManualPrompt } from '../manualPrompt'
import { toCsv } from '../export'

const firstNames = ['Asha', 'Vikram', 'Meera', 'Rahul', 'Fatima', 'Joseph', 'Anita', 'Dev', 'Leila', 'Sam']
const lastNames = ['Sharma', 'Patel', 'Nair', 'Khan', 'Fernandes', 'Iyer', 'Gupta', 'Rao']
const domains = ['acme.io', 'example.org', 'shop.local', 'clinic.example']
const notes = [
  'Met at the 2019 conference in Bangalore.\\nOffice shifted to Whitefield in 2021.',
  'School friend. Loves trekking. Old number discontinued.',
  'Doctor - clinic on MG Road, Tue/Fri only.',
  ''
]
const cats = ['friend', 'work', 'medical', 'family']

function buildCorpus(): string {
  let vcf = ''
  for (let i = 0; i < 220; i++) {
    const fn = `${firstNames[i % 10]} ${lastNames[i % 8]}` + (i % 7 === 0 ? '  work' : '')
    const email = `${firstNames[i % 10].toLowerCase()}${i}@${domains[i % 4]}`
    const phone = `+91 9${String(800000000 + i * 137).slice(0, 9)}`
    const note = notes[i % 4]
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${fn}`,
      `N:${lastNames[i % 8]};${firstNames[i % 10]};;;`,
      `TEL;TYPE=CELL:${phone}`,
      `EMAIL;TYPE=INTERNET:${email}`,
      'END:VCARD'
    ]
    if (i % 2 === 0) lines.splice(5, 0, `ORG:${domains[i % 4].split('.')[0]}`)
    if (i % 4 === 0) lines.splice(6, 0, `CATEGORIES:${cats[i % 4]}`)
    if (note) lines.splice(lines.length - 1, 0, `NOTE:${note}`)
    vcf += lines.join('\r\n') + '\r\n'
  }
  vcf += [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'FN:Dupe Five',
    'N:Five;Dupe;;;',
    'TEL;TYPE=CELL:9800000685',
    'EMAIL;TYPE=INTERNET:extra@dupe.test',
    'END:VCARD',
    ''
  ].join('\r\n')
  return vcf
}

describe('220+ contact corpus (stand-in for real Google export)', () => {
  it('parses, merges the duplicate, and round-trips without loss', () => {
    const parsed = parseVCard(buildCorpus())
    expect(parsed.contacts).toHaveLength(221)
    expect(parsed.errors).toHaveLength(0)

    const deduped = dedupeContacts(parsed.contacts)
    expect(deduped.contacts).toHaveLength(220)
    expect(deduped.groups).toHaveLength(1)
    const merged = deduped.contacts.find((c) => c.emails.some((e) => e.value === 'extra@dupe.test'))
    expect(merged?.fn).toBe('Joseph Iyer')
    expect(merged?.mergedFromIds).toHaveLength(1)

    const reparsed = parseVCard(generateVCard(deduped.contacts))
    expect(reparsed.errors).toHaveLength(0)
    expect(reparsed.contacts).toHaveLength(220)

    const originalFirst = parsed.contacts[0]
    const outputFirst = reparsed.contacts.find((c) => c.id !== originalFirst.id && c.fn === originalFirst.fn)
    expect(outputFirst).toBeDefined()
    expect(outputFirst?.notes).toEqual(originalFirst.notes)
    expect(outputFirst?.phones.map((p) => p.value)).toEqual(originalFirst.phones.map((p) => p.value))

    expect(toCsv(deduped.contacts).split('\r\n').length).toBeGreaterThan(220)
    expect(buildManualPrompt(deduped.contacts.slice(0, 20))).toContain('Batch 2 of 2')
  })
})
