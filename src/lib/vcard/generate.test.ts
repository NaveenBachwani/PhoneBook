import { describe, expect, it } from 'vitest'
import { parseVCard } from './parse'
import { generateVCard, splitForExport } from './generate'
import * as fixtures from './fixtures'

function physicalLines(text: string): string[] {
  return text.split('\r\n').filter((l, i, arr) => l !== '' || i === arr.length - 1)
}

describe('generateVCard', () => {
  it('emits CRLF, no BOM, trailing CRLF, VERSION:3.0', () => {
    const { contacts } = parseVCard(fixtures.minimal3)
    const out = generateVCard(contacts)
    expect(out.charCodeAt(0)).not.toBe(0xfeff)
    expect(out).toContain('VERSION:3.0')
    expect(out.endsWith('END:VCARD\r\n')).toBe(true)
    expect(out.replace(/\r\n/g, '\n')).not.toContain('\r')
  })

  it('keeps every physical line within 75 octets including the fold space', () => {
    const { contacts } = parseVCard(fixtures.unicode)
    const out = generateVCard(contacts)
    for (const line of physicalLines(out)) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
    }
  })

  it('never splits mid code point (Devanagari, Arabic, emoji survive folding)', () => {
    const { contacts } = parseVCard(fixtures.unicode)
    const out = generateVCard(contacts)
    expect(out).not.toContain('\ufffd')
    const reparsed = parseVCard(out)
    expect(reparsed.contacts[0].fn).toBe(contacts[0].fn)
    expect(reparsed.contacts[1].fn).toBe('علي حسن')
    expect(reparsed.contacts[2].fn).toBe('Joy 🎉 Friend')
  })

  it('escapes commas, semicolons and newlines in FN and NOTE', () => {
    const { contacts } = parseVCard(fixtures.minimal3)
    contacts[0].fn = 'Sharma, Ram; Jr'
    contacts[0].notes = ['line one\nline two']
    const out = generateVCard([contacts[0]])
    expect(out).toContain('FN:Sharma\\, Ram\\; Jr')
    expect(out).toContain('NOTE:line one\\nline two')
  })

  it('emits at most one FN, N, ORG, TITLE, NOTE per card', () => {
    const { contacts } = parseVCard(fixtures.multiNote)
    const out = generateVCard(contacts)
    expect(out.match(/^FN:/gm)).toHaveLength(1)
    expect(out.match(/^N:/gm)).toHaveLength(1)
    expect(out.match(/^NOTE:/gm)).toHaveLength(1)
  })

  it('is a fixed point: generate(parse(generate(x))) === generate(x)', () => {
    const files = [
      fixtures.minimal3,
      fixtures.qpNote,
      fixtures.photoBday,
      fixtures.unicode,
      fixtures.version21,
      fixtures.multiNote
    ]
    for (const file of files) {
      const first = generateVCard(parseVCard(file).contacts)
      const second = generateVCard(parseVCard(first).contacts)
      expect(second).toBe(first)
    }
  })

  it('retains note text and photo through parse-generate-parse', () => {
    const qp = parseVCard(fixtures.qpNote).contacts
    const out = parseVCard(generateVCard(qp)).contacts
    expect(out[0].notes[0]).toBe('Met at conf 2019.\nOld address: 12 MG Road, Bangalore.\nMoved in 2021.')

    const photo = parseVCard(fixtures.photoBday).contacts
    const outPhoto = parseVCard(generateVCard(photo)).contacts
    expect(outPhoto[0].photoLine).toBe(photo[0].photoLine)
    expect(outPhoto[0].categories).toEqual(['family', 'Friend'])
    expect(outPhoto[0].phones).toEqual(photo[0].phones)
  })
})

describe('splitForExport', () => {
  const mk = () => ({
    id: crypto.randomUUID(),
    fn: 'x',
    emails: [],
    phones: [],
    addresses: [],
    notes: [],
    categories: [],
    rawLines: []
  })
  it('splits above 3000 and keeps 3000 whole', () => {
    expect(splitForExport([], 3000)).toEqual([])
    expect(splitForExport(Array.from({ length: 3000 }, mk), 3000)).toHaveLength(1)
    expect(splitForExport(Array.from({ length: 4210 }, mk), 3000).map((x) => x.length)).toEqual([3000, 1210])
  })
})
