import { useState } from 'react'
import { egress } from '../lib/egress'

export default function EgressPanel() {
  const [open, setOpen] = useState(false)
  const entries = egress.entries()
  const summary = egress.summary()
  const lastPayload = egress.lastPayload()

  return (
    <section className="card">
      <h2>
        Network activity{' '}
        <span className="badge ok">{entries.length} request(s) this session</span>
      </h2>
      <p className="muted">
        Every request this app has sent, listed openly. No other network calls are made.
      </p>
      <button className="small" onClick={() => setOpen(!open)}>
        {open ? 'Hide details' : 'Show details'}
      </button>
      {open && (
        <>
          <table>
            <thead>
              <tr>
                <th>Domain</th>
                <th>Requests</th>
                <th>Data sent</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((row) => (
                <tr key={row.domain}>
                  <td>{row.domain}</td>
                  <td>{row.count}</td>
                  <td>{(row.bytes / 1024).toFixed(1)} KB</td>
                </tr>
              ))}
              {summary.length === 0 && (
                <tr>
                  <td colSpan={3} className="muted">
                    No requests yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="muted">
            Fields never sent: phones, addresses, birthdays, photos.
          </p>
          {lastPayload && (
            <details>
              <summary>Show the exact data of the last request</summary>
              <pre>{lastPayload}</pre>
            </details>
          )}
        </>
      )}
    </section>
  )
}
