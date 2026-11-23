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
    if (trimmed.length < 20) {
      setMessage('That key looks too short to be valid. Double-check that the whole key was pasted.')
      return
    }
    const otherProvider = (Object.values(PROVIDERS) as (typeof provider)[]).find(
      (p) => p.id !== providerId && p.keyFormat.test(trimmed)
    )
    if (otherProvider) {
      setMessage(
        `That looks like a ${otherProvider.label} key, but ${provider.label} is selected. Switch provider above, or paste the ${provider.label} key.`
      )
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
      if (status === 404 || status === 410) {
        setMessage(
          'The AI model this app uses is temporarily unavailable at the provider. This usually fixes itself with an app update — please try again later.'
        )
      } else if (status === 429) {
        setMessage('The free tier is busy right now. Wait a minute and try again.')
      } else if (status === 401 || status === 403) {
        setMessage(
          'The provider rejected the key. Double-check it, and if you restricted it to specific websites, make sure this site is allowed.'
        )
      } else if (status) {
        setMessage(`The provider had a problem (error ${status}). Please try again in a moment.`)
      } else {
        setMessage("Couldn't reach the provider. Check your internet connection and try again.")
      }
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
