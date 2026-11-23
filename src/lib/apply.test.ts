import { describe, expect, it } from 'vitest'
import { applyUpdates, revertContact } from './apply'
import type { Contact } from './vcard/types'

function make(partial: Partial<Contact> = {}): Contact {
  return {
    id: crypto.randomUUID(),
    fn: 'X',
    emails: [],
    phones: [],
    addresses: [],
    notes: [],
    categories: [],
    rawLines: [],
    ...partial
  }
}

describe('applyUpdates', () => {
  it('adds only whitelisted AI categories, never removes existing ones', () => {
    const c = make({ categories: ['family'] })
    const first = applyUpdates([c], [{ id: c.id, cleaned_fn: 'X', category: 'work' }])
    const second = applyUpdates(first.contacts, [{ id: c.id, cleaned_fn: 'X', category: 'bogus-category' }])
    const third = applyUpdates(second.contacts, [{ id: c.id, cleaned_fn: 'X', category: 'family' }])
    expect(third.contacts[0].categories).toEqual(['family', 'work'])
  })

  it('keeps notes untouched and records suggestions separately', () => {
    const c = make({ notes: ['original note'], fn: 'messy  work' })
    const { contacts, suggestions } = applyUpdates([c], [
      { id: c.id, cleaned_fn: 'Messy', category: 'friend', cleaned_note: 'tidied note' }
    ])
    expect(contacts[0].notes).toEqual(['original note'])
    expect(contacts[0].fn).toBe('Messy')
    expect(suggestions).toEqual([{ id: c.id, suggested: 'tidied note' }])
  })

  it('fills an empty org with enriched_org but never overwrites one', () => {
    const empty = make()
    const hasOrg = make({ orgComponents: ['Existing Co'] })
    const { contacts } = applyUpdates([empty, hasOrg], [
      { id: empty.id, cleaned_fn: 'X', category: 'other', enriched_org: 'Acme' },
      { id: hasOrg.id, cleaned_fn: 'X', category: 'other', enriched_org: 'Acme' }
    ])
    expect(contacts[0].orgComponents).toEqual(['Acme'])
    expect(contacts[1].orgComponents).toEqual(['Existing Co'])
  })
})

describe('revertContact', () => {
  it('restores reviewable fields from the original', () => {
    const orig = make({ fn: 'Original', categories: ['friend'], notes: ['orig note'] })
    const current = make({ fn: 'Changed', categories: ['work'], notes: ['new note'] })
    const reverted = revertContact(current, orig)
    expect(reverted.fn).toBe('Original')
    expect(reverted.categories).toEqual(['friend'])
    expect(reverted.notes).toEqual(['orig note'])
  })
})
