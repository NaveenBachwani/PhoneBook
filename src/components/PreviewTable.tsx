import type { Contact } from '../lib/vcard/types'
import type { MergeGroup } from '../lib/vcard/dedupe'
import { buildPayload } from '../lib/prompt'

interface Props {
  contacts: Contact[]
  mergeGroups: MergeGroup[]
  onCleanWithAI: () => void
  onManualPrompt: () => void
  onBack: () => void
}

export default function PreviewTable({ contacts, mergeGroups, onCleanWithAI, onManualPrompt, onBack }: Props) {
  const mergedIds = new Set(mergeGroups.flatMap((g) => g.duplicateIds))
  const actions = (
    <div className="toolbar">
      <button className="primary" onClick={onCleanWithAI}>
        Clean with AI
      </button>
      <button onClick={onManualPrompt}>Get manual prompt (no AI key needed)</button>
    </div>
  )

  return (
    <section className="card">
      <h2>Preview — {contacts.length} contacts</h2>
      {actions}
      {mergeGroups.length > 0 && (
        <p className="muted">
          {mergeGroups.length} duplicate group(s) found — these will be merged into one contact
          (nothing is deleted: phones, emails and notes from both are kept).
        </p>
      )}
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Organization</th>
              <th>Emails</th>
              <th>Phones</th>
              <th>Tags</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {contacts.slice(0, 100).map((c) => (
              <tr key={c.id}>
                <td>
                  {c.fn}{' '}
                  {mergedIds.has(c.id) && <span className="badge">will be merged</span>}
                </td>
                <td>{c.orgComponents?.filter(Boolean).join('; ')}</td>
                <td>{c.emails.map((e) => e.value).join(', ')}</td>
                <td>{c.phones.map((p) => p.value).join(', ')}</td>
                <td>{c.categories.join(', ')}</td>
                <td className="muted">
                  {c.notes.length
                    ? c.notes.join(' ').slice(0, 60) + (c.notes.join(' ').length > 60 ? '…' : '')
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {contacts.length > 100 && (
        <p className="muted">Showing the first 100 of {contacts.length}. Everything is included when cleaning.</p>
      )}

      <details>
        <summary>Preview exactly what will be sent to the AI</summary>
        <pre>{buildPayload(contacts.slice(0, 3))}</pre>
        <p className="muted">
          Example with 3 contacts. Phones, addresses, birthdays and photos are never sent.
        </p>
      </details>

      <div className="toolbar">
        <button onClick={onBack}>← Choose a different file</button>
      </div>
      {actions}
      <p className="muted">
        "Clean with AI" uses your own free AI key (next screen). "Manual prompt" gives you text to
        paste into any AI chatbot yourself.
      </p>
    </section>
  )
}
