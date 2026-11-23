import { describe, expect, it } from 'vitest'
import { parseVCard, unescapeText, escapeText, splitUnescaped } from './parse'
import * as fixtures from './fixtures'

describe('parseVCard', () => {
  it('parses a 3-contact file with no notes', () => {
    const { contacts, errors } = parseVCard(fixtures.minimal3)
    expect(errors).toHaveLength(0)
    expect(contacts).toHaveLength(3)
    const ram = contacts[0]
    expect(ram.fn).toBe('Ram K. Sharma')
    expect(ram.n?.family).toBe('Sharma')
    expect(ram.n?.given).toBe('Ram')
    expect(ram.n?.additional).toBe('K')
    expect(ram.orgComponents).toEqual(['Acme.io'])
    expect(ram.title).toBe('Founder')
    expect(ram.phones).toEqual([{ value: '+91 98765 43210', type: 'CELL,VOICE' }])
    expect(ram.emails).toEqual([
      { value: 'ram@acme.io', type: 'INTERNET,HOME' },
      { value: 'ram@personal.example.com', type: 'WORK' }
    ])
    expect(ram.notes).toEqual([])
  })

  it('decodes a folded quoted-printable note with soft breaks', () => {
    const { contacts } = parseVCard(fixtures.qpNote)
    expect(contacts[0].notes).toEqual([
      'Met at conf 2019.\nOld address: 12 MG Road, Bangalore.\nMoved in 2021.'
    ])
  })

  it('preserves photo, bday, uid, rev verbatim and handles grouped props', () => {
    const { contacts, errors } = parseVCard(fixtures.photoBday)
    expect(errors).toHaveLength(0)
    const c = contacts[0]
    expect(c.photoLine).toMatch(/^PHOTO;ENCODING=BASE64;TYPE=JPEG:[A-Za-z0-9+/=]+$/)
    expect(c.photoLine).not.toContain('\r\n')
    expect(c.photoLine?.length).toBeGreaterThan(100)
    expect(c.bdayLine).toBe('BDAY:1990-04-15')
    expect(c.uidLine).toBe('UID:https://example.com/test-uid')
    expect(c.revLine).toBe('REV:20240101T000000Z')
    expect(c.categories).toEqual(['family', 'Friend'])
    expect(c.addresses[0].components[2]).toBe('12 MG Road')
    expect(c.addresses[0].components[6]).toBe('India')
    expect(c.phones).toEqual([{ value: '+91 11111 22222', type: 'CELL' }])
    expect(c.rawLines).toContain('item1.X-ABLabel:_$!<Mobile>!$_')
  })

  it('handles unicode names, folded lines and unparsed garbage', () => {
    const { contacts } = parseVCard(fixtures.unicode)
    expect(contacts).toHaveLength(3)
    expect(contacts[0].fn).toBe('प्रिया शर्मा प्रिया शर्मा प्रिया शर्मा प्रिया')
    expect(contacts[0].n?.family).toBe('शर्मा')
    expect(contacts[0].rawLines).toContain('this line has no colon')
    expect(contacts[1].fn).toBe('علي حسن')
    expect(contacts[2].fn).toBe('Joy 🎉 Friend')
  })

  it('tolerates VERSION:2.1 with bare params and QP soft breaks', () => {
    const { contacts } = parseVCard(fixtures.version21)
    expect(contacts[0].phones).toEqual([{ value: '+91 98765 43210', type: 'CELL' }])
    expect(contacts[0].notes).toEqual(['Card from old phone with soft break.'])
  })

  it('collects multiple NOTE properties', () => {
    const { contacts } = parseVCard(fixtures.multiNote)
    expect(contacts[0].notes).toEqual(['First note from old phone.', 'Second\nnote.'])
  })

  it('reports a card missing END and parses it anyway', () => {
    const { contacts, errors } = parseVCard('BEGIN:VCARD\r\nVERSION:3.0\r\nFN:No End\r\n')
    expect(contacts).toHaveLength(1)
    expect(contacts[0].fn).toBe('No End')
    expect(errors[0].message).toMatch(/missing END/i)
  })

  it('preserves the unterminated card when another BEGIN arrives', () => {
    const { contacts, errors } = parseVCard(
      'BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Unclosed Card\r\nBEGIN:VCARD\r\nVERSION:3.0\r\nFN:Next Card\r\nEND:VCARD\r\n'
    )
    expect(contacts).toHaveLength(2)
    expect(contacts[0].fn).toBe('Unclosed Card')
    expect(contacts[1].fn).toBe('Next Card')
    expect(errors[0].message).toMatch(/nested BEGIN/i)
  })
})

describe('escaping', () => {
  it('round-trips escape and unescape', () => {
    const raw = 'Sharma, Ram; Jr.\nLine two\\path and, comma'
    expect(unescapeText(escapeText(raw))).toBe(raw)
  })

  it('splits on unescaped separators only', () => {
    expect(splitUnescaped('a\\;b;c', ';')).toEqual(['a\\;b', 'c'])
    expect(splitUnescaped('a\\,b,c', ',')).toEqual(['a\\,b', 'c'])
  })
})
