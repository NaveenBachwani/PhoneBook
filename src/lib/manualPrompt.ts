import { SYSTEM_PROMPT, toPayloadContact } from './prompt'
import { chunk } from './batch'
import type { Contact } from './vcard/types'

export function buildManualPrompt(contacts: Contact[], perBatch = 15): string {
  const batches = chunk(contacts, perBatch)
  const sections = batches.map((batch, i) => {
    const lines = batch.map((c) => JSON.stringify(toPayloadContact(c)))
    return [
      `=== Batch ${i + 1} of ${batches.length} - paste this into your AI chatbot ===`,
      SYSTEM_PROMPT,
      'Contacts:',
      lines.join('\n')
    ].join('\n\n')
  })
  return sections.join('\n\n\n')
}
