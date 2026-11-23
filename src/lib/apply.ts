import { CATEGORIES } from './constants'
import type { Contact, LLMContactUpdate } from './vcard/types'

export interface NoteSuggestion {
  id: string
  suggested: string
}

export interface AppliedContact {
  contact: Contact
  suggestedNote?: string
}

export function applyUpdates(
  contacts: Contact[],
  updates: LLMContactUpdate[]
): { contacts: Contact[]; suggestions: NoteSuggestion[] } {
  const updateById = new Map(updates.map((u) => [u.id, u]))
  const suggestions: NoteSuggestion[] = []
  const next = contacts.map((c) => {
    const u = updateById.get(c.id)
    if (!u) return c
    const merged: Contact = { ...c }
    if (u.cleaned_fn && u.cleaned_fn.trim()) merged.fn = u.cleaned_fn.trim()
    if (
      u.category &&
      (CATEGORIES as readonly string[]).includes(u.category) &&
      u.category !== 'other' &&
      !merged.categories.some((x) => x.toLowerCase() === u.category.toLowerCase())
    ) {
      merged.categories = [...merged.categories, u.category]
    }
    if (u.cleaned_note && u.cleaned_note.trim() && u.cleaned_note !== c.notes.join('\n')) {
      suggestions.push({ id: c.id, suggested: u.cleaned_note })
    }
    if (u.enriched_org && u.enriched_org.trim() && !(merged.orgComponents?.some((x) => x.trim()))) {
      merged.orgComponents = [u.enriched_org.trim()]
    }
    return merged
  })
  return { contacts: next, suggestions }
}

export function revertContact(current: Contact, original: Contact): Contact {
  return {
    ...current,
    fn: original.fn,
    categories: original.categories,
    orgComponents: original.orgComponents,
    notes: original.notes
  }
}
