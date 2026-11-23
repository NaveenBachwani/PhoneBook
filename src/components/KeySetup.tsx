import { useState } from 'react'
import { PROVIDERS, type ProviderId } from '../lib/providers'
import * as keyStore from '../lib/keyStore'

interface Props {
  onReady: (providerId: ProviderId) => void
  onBack: () => void
}

export default function KeySetup({ onReady, onBack }: Props) {
  const [providerId, setProviderId] = useState<ProviderId>('gemini')
  const [key, setKey] = useState(keyStore.getKey() ?? '')
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const provider = PROVIDERS[providerId]

  async function testAndContinue() {
    const trimmed = key.trim()
    if (!provider.keyFormat.test(trimmed)) {
      setMessage('That does not look like a valid key for this provider. Double-check and paste it again.')
      return
    }
    setTesting(true)
    setMessage(null)
    try {
      const ok = await provider.testKey(trimmed)
      if (ok) {
        keyStore.setKey(trimmed)
        onReady(providerId)
      } else {
        setMessage("That key doesn't work. Double-check it and try again.")
      }
    } catch (err) {
      const status = (err as { status?: number }).status
      setMessage(
        status === 401 || status === 403
          ? 'The provider rejected the key. If you restricted it to specific websites, allow this site.'
          : "Couldn't reach the provider. Check your internet connection and try again."
      )
    } finally {
      setTesting(false)
    }
  }

  return (
    <section className="card">
      <h2>Connect your free AI key</h2>
      <p className="muted">
        Your key stays in this browser tab's memory. We never send it anywhere except directly to
        the provider you choose. Close the tab and it's forgotten. To be extra safe, restrict the
        key to this website in your provider's console.
      </p>

      <div className="toolbar">
        {(Object.keys(PROVIDERS) as ProviderId[]).map((id) => (
          <button
            key={id}
            className={id === providerId ? 'primary' : ''}
            onClick={() => {
              setProviderId(id)
              setMessage(null)
            }}
          >
            {PROVIDERS[id].label}
          </button>
        ))}
      </div>

      <details>
        <summary>How do I get a free {provider.label} key?</summary>
        <ol className="steps">
          <li>
            Open{' '}
            <a href={provider.keyUrl} target="_blank" rel="noreferrer">
              {provider.keyUrl}
            </a>{' '}
            and sign in with your account.
          </li>
          <li>Create a new API key (the free tier is enough for thousands of contacts).</li>
          <li>Copy the key and paste it below.</li>
        </ol>
      </details>
      <details>
        <summary>How do I restrict my key to this site?</summary>
        <p className="muted">
          In your provider's key settings, you can restrict the key to specific websites. This app
          runs entirely in your browser, so restricting it here adds a second lock: even if someone
          saw the key, it would only work from this website.
        </p>
      </details>

      <p>
        <label htmlFor="apikey">
          <strong>{provider.label} API key</strong>
        </label>
        <input
          id="apikey"
          type="password"
          autoComplete="off"
          placeholder="Paste your key here"
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
      </p>
      {message && <p className="badge warn" style={{ padding: '0.5rem 0.75rem' }}>{message}</p>}

      <div className="toolbar">
        <button className="primary" disabled={testing || !key.trim()} onClick={() => void testAndContinue()}>
          {testing ? 'Testing key…' : 'Test & continue'}
        </button>
        <button onClick={onBack}>Back</button>
      </div>
    </section>
  )
}
