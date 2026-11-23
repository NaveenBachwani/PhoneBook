import { describe, expect, it } from 'vitest'
import { parseVCard } from './parse'
import { dedupeContacts, normalizePhone, normalizeEmail } from './dedupe'
import { generateVCard } from './generate'

function make(overrides: Partial<import('./types').Contact> = {}): import('./types').Contact {
  return {
    id: crypto.randomUUID(),
    fn: 'X',
    emails: [],
    phones: [],
    addresses: [],
    notes: [],
    categories: [],
    rawLines: [],
    ...overrides
  }
}

describe('normalize helpers', () => {
  it('keeps last 10 digits for phones', () => {
    expect(normalizePhone('+91 98765 43210')).toBe('9876543210')
    expect(normalizePhone('09876543210')).toBe('9876543210')
    expect(normalizePhone('(987) 654-3210')).toBe('9876543210')
    expect(normalizePhone('100')).toBe('100')
  })
  it('lowercases and trims emails', () => {
    expect(normalizeEmail('  Ram@Acme.IO ')).toBe('ram@acme.io')
  })
})

describe('dedupeContacts', () => {
  it('merges contacts sharing a phone across formats, unioning all data', () => {
    const a = make({
      fn: 'Raj',
      phones: [{ value: '+91 98765 43210' }],
      notes: ['school friend']
    })
    const b = make({
      fn: 'Raj Patel',
      phones: [{ value: '09876543210' }, { value: '+91 98222 00000' }],
      emails: [{ value: 'raj@acme.io' }],
      categories: ['friend']
    })
    const { contacts, groups } = dedupeContacts([a, b])
    expect(contacts).toHaveLength(1)
    expect(groups).toHaveLength(1)
    const merged = contacts[0]
    expect(merged.phones.map((p) => p.value)).toEqual(['09876543210', '+91 98222 00000'])
    expect(merged.emails.map((e) => e.value)).toEqual(['raj@acme.io'])
    expect(merged.notes).toEqual(['school friend'])
    expect(merged.categories).toEqual(['friend'])
    expect(merged.mergedFromIds).toHaveLength(1)
  })

  it('merges on case-insensitive email and keeps the richer record as primary', () => {
    const thin = make({ fn: 'Thin', phones: [{ value: '9876543210' }] })
    const rich = make({
      fn: 'Rich Record',
      phones: [{ value: '+91 98765 43210' }],
      emails: [{ value: 'RICH@acme.io' }],
      orgComponents: ['Acme'],
      title: 'CEO',
      addresses: [{ components: ['', '', '1 Road', '', '', '', ''] }]
    })
    const { contacts } = dedupeContacts([thin, rich])
    expect(contacts).toHaveLength(1)
    expect(contacts[0].fn).toBe('Rich Record')
    expect(contacts[0].title).toBe('CEO')
    expect(contacts[0].phones).toHaveLength(1)
  })

  it('carries the duplicate structured name when the primary lacks one', () => {
    const primary = make({ fn: 'Rich Primary', phones: [{ value: '+91 9000000001' }] })
    const losing = make({
      fn: 'Other Name',
      phones: [{ value: '9000000001' }],
      n: { family: 'Middlename', given: 'Anne', prefix: 'Dr' }
    })
    const { contacts, groups } = dedupeContacts([primary, losing])
    expect(groups).toHaveLength(1)
    const merged = contacts.find((c) => c.n?.prefix === 'Dr')
    expect(merged?.fn).toBe('Other Name')
    expect(merged?.n?.family).toBe('Middlename')
    expect(merged?.mergedFromIds).toHaveLength(1)
  })

  it('does not merge distinct contacts', () => {
    const { contacts, groups } = dedupeContacts([
      make({ phones: [{ value: '9876543210' }] }),
      make({ phones: [{ value: '9876543211' }] })
    ])
    expect(contacts).toHaveLength(2)
    expect(groups).toHaveLength(0)
  })

  it('round-trips merged output through the generator without loss', () => {
    const a = make({ fn: 'A', phones: [{ value: '+91 98765 43210' }], notes: ['note a'] })
    const b = make({ fn: 'B', phones: [{ value: '09876543210' }], notes: ['note b'], emails: [{ value: 'b@x.io' }] })
    const { contacts } = dedupeContacts([a, b])
    const out = parseVCard(generateVCard(contacts)).contacts
    expect(out[0].phones.map((p) => p.value)).toEqual(['09876543210'])
    expect(out[0].notes[0].split('\n').sort()).toEqual(['note a', 'note b'])
    expect(out[0].emails).toEqual([{ value: 'b@x.io' }])
  })
})
