import { describe, expect, it } from 'vitest'
import { appendNewInfo, noteLengthWarning, todayMarker } from './notes'

describe('appendNewInfo (retention contract)', () => {
  it('keeps the original note untouched and appends below a clear marker', () => {
    const out = appendNewInfo('Met at conf 2019.', 'Inferred org: Acme')
    expect(out.startsWith('Met at conf 2019.')).toBe(true)
    expect(out).toContain(todayMarker())
    expect(out).toContain('Inferred org: Acme')
  })

  it('changes nothing when there are no additions', () => {
    expect(appendNewInfo('Original', '')).toBe('Original')
  })

  it('is idempotent: a second run replaces the previous section', () => {
    const first = appendNewInfo('Original', 'Addition one')
    const second = appendNewInfo(first, 'Addition two')
    expect(second.startsWith('Original')).toBe(true)
    expect(second).not.toContain('Addition one')
    expect(second).toContain('Addition two')
    expect(second.match(/Added by PhoneBook/g)).toHaveLength(1)
  })

  it('handles an empty original note', () => {
    expect(appendNewInfo('', 'Addition')).toBe(`${todayMarker()}\nAddition`)
  })
})

describe('noteLengthWarning', () => {
  it('warns only above the limit', () => {
    expect(noteLengthWarning('x'.repeat(1000))).toBeUndefined()
    expect(noteLengthWarning('x'.repeat(1001))).toMatch(/truncate/i)
  })
})
