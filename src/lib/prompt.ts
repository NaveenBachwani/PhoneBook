import { CATEGORIES } from './constants'
import type { Contact, ContactName } from './vcard/types'

export interface PayloadContact {
  id: string
  fn: string
  n?: ContactName
  org?: string
  title?: string
  emails: { value: string; type?: string }[]
  note?: string
}

export interface LLMPayload {
  task: 'clean_and_enrich_contacts'
  instructions: string
  contacts: PayloadContact[]
}

export const STRIPPED_FIELDS = ['phones', 'addresses', 'bday', 'photo']

export const SYSTEM_PROMPT = `You clean and categorize contact records from a personal address book.

For each contact you receive, return exactly one object with these fields:
- id: the same id you received (required, must match exactly)
- cleaned_fn: a properly-cased, human-readable display name with no job titles, no emoji decoration, no trailing "work"/"mobile"/"old" suffixes. Preserve the person's intended form: "Ram K. Sharma", not "RAM K SHARMA".
- category: exactly one of: ${CATEGORIES.join(', ')}. Use "other" when uncertain—do not guess.
- cleaned_note: a tidied version of the note text. Remove duplicated lines and obvious junk ("old number", repeated addresses) only when clearly obsolete. Keep meaningful context (where you met, relationship, shared projects). Never invent information. If the original note is already clean, return it unchanged. If the note is empty, omit the field.
- enriched_org: only if the email domain clearly indicates an employer (e.g., "@acme.io" → "Acme") AND the org field was empty. Otherwise omit.

Rules:
- Never invent phone numbers, addresses, or email addresses.
- Never invent names. Clean the existing name, do not replace it.
- Never change the id.
- Never return fewer or more objects than you received.
- Return only valid JSON. No markdown fences, no commentary.

Output format:
{ "updates": [ { ... }, { ... } ] }`

export function toPayloadContact(c: Contact): PayloadContact {
  const out: PayloadContact = {
    id: c.id,
    fn: c.fn,
    emails: c.emails.map((e) => (e.type ? { value: e.value, type: e.type } : { value: e.value }))
  }
  if (c.n && Object.values(c.n).some(Boolean)) out.n = c.n
  if (c.orgComponents?.some((x) => x.trim())) out.org = c.orgComponents.filter(Boolean).join('; ')
  if (c.title) out.title = c.title
  if (c.notes.length) out.note = c.notes.join('\n')
  return out
}

export function buildPayload(contacts: Contact[]): string {
  const payload: LLMPayload = {
    task: 'clean_and_enrich_contacts',
    instructions: SYSTEM_PROMPT,
    contacts: contacts.map(toPayloadContact)
  }
  return JSON.stringify(payload)
}
