import type { Contact } from './types'

export function normalizePhone(v: string): string {
  const digits = v.replace(/\D/g, '')
  return digits.length > 10 ? digits.slice(-10) : digits
}

export function normalizeEmail(v: string): string {
  return v.trim().toLowerCase()
}

export interface MergeGroup {
  primaryId: string
  duplicateIds: string[]
}

interface KeyIndex {
  key: string
  contactIndex: number
}

function uniquenessKeys(c: Contact): string[] {
  const keys: string[] = []
  for (const p of c.phones) {
    const n = normalizePhone(p.value)
    if (n) keys.push('p:' + n)
  }
  for (const e of c.emails) {
    const n = normalizeEmail(e.value)
    if (n) keys.push('e:' + n)
  }
  return keys
}

function nonEmptyFieldCount(c: Contact): number {
  let count = 0
  if (c.fn) count++
  if (c.n && Object.values(c.n).some(Boolean)) count++
  if (c.orgComponents?.some((x) => x.trim())) count++
  if (c.title) count++
  if (c.emails.length) count++
  if (c.phones.length) count++
  if (c.addresses.length) count++
  if (c.notes.length) count++
  if (c.categories.length) count++
  if (c.bdayLine) count++
  if (c.photoLine) count++
  return count
}

function mergeInto(primary: Contact, other: Contact): void {
  for (const p of other.phones) {
    const n = normalizePhone(p.value)
    if (!primary.phones.some((x) => normalizePhone(x.value) === n)) primary.phones.push(p)
  }
  for (const e of other.emails) {
    const n = normalizeEmail(e.value)
    if (!primary.emails.some((x) => normalizeEmail(x.value) === n)) primary.emails.push(e)
  }
  for (const a of other.addresses) {
    const sig = (a.type ?? '') + '|' + a.components.join('|')
    if (!primary.addresses.some((x) => (x.type ?? '') + '|' + x.components.join('|') === sig)) {
      primary.addresses.push(a)
    }
  }
  for (const note of other.notes) {
    if (!primary.notes.includes(note)) primary.notes.push(note)
  }
  for (const cat of other.categories) {
    if (!primary.categories.some((x) => x.toLowerCase() === cat.toLowerCase())) primary.categories.push(cat)
  }
  if (!primary.orgComponents?.some((x) => x.trim()) && other.orgComponents?.some((x) => x.trim())) {
    primary.orgComponents = other.orgComponents
  }
  if (!primary.title && other.title) primary.title = other.title
  if (!primary.n && other.n && Object.values(other.n).some(Boolean)) primary.n = other.n
  if (!primary.bdayLine && other.bdayLine) primary.bdayLine = other.bdayLine
  if (!primary.photoLine && other.photoLine) primary.photoLine = other.photoLine
  if (!primary.uidLine && other.uidLine) primary.uidLine = other.uidLine
  if (!primary.revLine && other.revLine) primary.revLine = other.revLine
  for (const raw of other.rawLines) {
    if (!primary.rawLines.includes(raw)) primary.rawLines.push(raw)
  }
}

export function dedupeContacts(contacts: Contact[]): { contacts: Contact[]; groups: MergeGroup[] } {
  const parent = contacts.map((_, i) => i)

  function find(i: number): number {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]]
      i = parent[i]
    }
    return i
  }

  function union(a: number, b: number): void {
    parent[find(a)] = find(b)
  }

  const seen = new Map<string, KeyIndex>()
  contacts.forEach((c, i) => {
    for (const key of uniquenessKeys(c)) {
      const prior = seen.get(key)
      if (prior !== undefined) union(i, prior.contactIndex)
      else seen.set(key, { key, contactIndex: i })
    }
  })

  const clusters = new Map<number, number[]>()
  contacts.forEach((_, i) => {
    const root = find(i)
    const list = clusters.get(root)
    if (list) list.push(i)
    else clusters.set(root, [i])
  })

  const result: Contact[] = []
  const groups: MergeGroup[] = []
  for (const members of clusters.values()) {
    if (members.length === 1) {
      result.push(contacts[members[0]])
      continue
    }
    const sorted = [...members].sort(
      (a, b) => nonEmptyFieldCount(contacts[b]) - nonEmptyFieldCount(contacts[a]) || a - b
    )
    const primaryIdx = sorted[0]
    const primary = contacts[primaryIdx]
    const duplicateIds: string[] = []
    for (const idx of sorted.slice(1)) {
      mergeInto(primary, contacts[idx])
      duplicateIds.push(contacts[idx].id)
    }
    primary.mergedFromIds = duplicateIds
    groups.push({ primaryId: primary.id, duplicateIds })
    result.push(primary)
  }
  return { contacts: result, groups }
}
