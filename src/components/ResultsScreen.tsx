import { useMemo, useState } from 'react'
import type { Contact } from '../lib/vcard/types'
import type { NoteSuggestion } from '../lib/apply'
import type { BatchFailure } from '../lib/batch'
import { downloadCsv, downloadVcfFiles, oversizedFiles, vcfFileNames } from '../lib/export'
import { noteLengthWarning } from '../lib/notes'
import { CATEGORIES } from '../lib/constants'

interface Props {
  contacts: Contact[]
  original: Contact[]
  suggestions: NoteSuggestion[]
  failures: BatchFailure[]
  aborted: boolean
  onRevert: (id: string) => void
  onApplySuggestion: (id: string) => void
  onEdit: (id: string, patch: Partial<Contact>) => void
  onShowImport: () => void
}

export default function ResultsScreen({
  contacts,
  original,
  suggestions,
  failures,
  aborted,
  onRevert,
  onApplySuggestion,
  onEdit,
  onShowImport
}: Props) {
  const [showRaw, setShowRaw] = useState(false)
  const originalById = useMemo(() => new Map(original.map((c) => [c.id, c])), [original])
  const suggestionById = useMemo(() => new Map(suggestions.map((s) => [s.id, s.suggested])), [suggestions])
  const fileNames = vcfFileNames(contacts)
  const oversized = oversizedFiles(contacts)

  return (
    <>
      <section className="card">
        <div className="toolbar" style={{ marginTop: 0 }}>
          <button className="primary" onClick={() => downloadVcfFiles(contacts)}>
            Download cleaned .vcf{fileNames.length > 1 ? ` (${fileNames.length} files)` : ''}
          </button>
          <button onClick={() => downloadCsv(contacts)}>Download CSV</button>
          <button onClick={onShowImport}>Import instructions</button>
        </div>
        <h2>Review your cleaned contacts</h2>
        {aborted && (
          <p className="badge warn" style={{ padding: '0.5rem 0.75rem' }}>
            You stopped the run early. Results received so far are below; contacts not processed are unchanged.
          </p>
        )}
        {failures.length > 0 && (
          <p className="badge warn" style={{ padding: '0.5rem 0.75rem' }}>
            {failures.length} batch issue(s): {failures.map((f) => f.reason).join(' | ')}
            {failures.some((f) => f.raw) && (
              <>
                {' '}
                <button className="small" onClick={() => setShowRaw(!showRaw)}>
                  {showRaw ? 'Hide raw response' : 'Show raw response'}
                </button>
              </>
            )}
          </p>
        )}
        {showRaw && (
          <pre>{failures.map((f) => `[batch ${f.batch}] ${f.reason}\n${f.raw ?? ''}`).join('\n\n')}</pre>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table className="results-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Tags (added by AI)</th>
                <th>Note</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => {
                const orig = originalById.get(c.id)
                const changed = orig && orig.fn !== c.fn
                const suggested = suggestionById.get(c.id)
                const noteText = c.notes.join('\n')
                const warn = noteLengthWarning(noteText)
                return (
                  <tr key={c.id}>
                    <td>
                      <input
                        type="text"
                        value={c.fn}
                        onChange={(e) => onEdit(c.id, { fn: e.target.value })}
                        style={changed ? { borderColor: 'var(--amber)' } : undefined}
                      />
                      {c.orgComponents?.filter(Boolean).join('; ') && (
                        <div className="muted">{c.orgComponents.filter(Boolean).join('; ')}</div>
                      )}
                    </td>
                    <td>
                      <input
                        type="text"
                        value={c.categories.join(', ')}
                        placeholder={CATEGORIES.join(', ')}
                        onChange={(e) =>
                          onEdit(c.id, {
                            categories: e.target.value
                              .split(',')
                              .map((x) => x.trim())
                              .filter(Boolean)
                          })
                        }
                      />
                    </td>
                    <td>
                      {noteText ? (
                        <>
                          {noteText.slice(0, 80)}…{' '}
                          {warn && <span className="badge warn" title={warn}>long note</span>}
                        </>
                      ) : (
                        <span className="muted"> - </span>
                      )}
                      {suggested && (
                        <details>
                          <summary>AI suggests a tidier note</summary>
                          <pre>{suggested}</pre>
                          <button className="small" onClick={() => onApplySuggestion(c.id)}>
                            Use AI note
                          </button>
                          <span className="muted"> (replaces the current note - you can revert until download)</span>
                        </details>
                      )}
                    </td>
                    <td>
                      <button className="small" onClick={() => onRevert(c.id)}>
                        Revert
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>Download</h2>
        <div className="toolbar">
          <button className="primary" onClick={() => downloadVcfFiles(contacts)}>
            Download cleaned .vcf{fileNames.length > 1 ? ` (${fileNames.length} files)` : ''}
          </button>
          <button onClick={() => downloadCsv(contacts)}>Download CSV (for spreadsheets only)</button>
          <button onClick={onShowImport}>Show import instructions</button>
        </div>
        {fileNames.length > 1 && (
          <p className="muted">
            Your list is larger than Google's 3,000-per-import limit, so we split it into {fileNames.length} files:
            {fileNames.map((n) => ` ${n}`).join(',')} - import them one after another.
          </p>
        )}
        {oversized && (
          <p className="badge warn" style={{ padding: '0.5rem 0.75rem' }}>
            One or more files exceed Google's 20 MB import limit. Consider removing photos and trying again.
          </p>
        )}
        <p className="muted">The CSV is for viewing in a spreadsheet - do not import it into Google Contacts.</p>
      </section>
    </>
  )
}
