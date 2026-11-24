import { useEffect, useRef, useState } from 'react'
import type { Contact, ParseResult } from './lib/vcard/types'
import { dedupeContacts, type MergeGroup } from './lib/vcard/dedupe'
import { runBatch, type BatchFailure } from './lib/batch'
import { applyUpdates, type NoteSuggestion } from './lib/apply'
import { buildManualPrompt } from './lib/manualPrompt'
import { downloadBlob } from './lib/export'
import { PROVIDERS, type ProviderId } from './lib/providers'
import * as keyStore from './lib/keyStore'
import UploadScreen from './components/UploadScreen'
import PreviewTable from './components/PreviewTable'
import KeySetup from './components/KeySetup'
import ProgressBar from './components/ProgressBar'
import EgressPanel from './components/EgressPanel'
import ResultsScreen from './components/ResultsScreen'
import ImportInstructions from './components/ImportInstructions'
import Brand from './components/Brand'
import Footer from './components/Footer'

type Screen = 'upload' | 'preview' | 'keysetup' | 'cleaning' | 'results' | 'import'

export default function App() {
  const [screen, setScreen] = useState<Screen>('upload')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [original, setOriginal] = useState<Contact[]>([])
  const [mergeGroups, setMergeGroups] = useState<MergeGroup[]>([])
  const [providerId, setProviderId] = useState<ProviderId | null>(null)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [batchInfo, setBatchInfo] = useState<string | null>(null)
  const [failures, setFailures] = useState<BatchFailure[]>([])
  const [suggestions, setSuggestions] = useState<NoteSuggestion[]>([])
  const [aborted, setAborted] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (screen !== 'cleaning' && screen !== 'results') return
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [screen])

  function handleParsed(result: ParseResult) {
    const deduped = dedupeContacts(result.contacts)
    setOriginal(result.contacts)
    setContacts(deduped.contacts)
    setMergeGroups(deduped.groups)
    setScreen('preview')
  }

  function handleManualPrompt() {
    downloadBlob(buildManualPrompt(contacts), 'manual-prompt.txt', 'text/plain')
  }

  async function startCleaning(id: ProviderId) {
    const provider = PROVIDERS[id]
    const key = keyStore.getKey()
    if (!key) return
    setProviderId(id)
    setScreen('cleaning')
    setProgress({ done: 0, total: contacts.length })
    setBatchInfo(null)
    setFailures([])
    setAborted(false)
    const controller = new AbortController()
    abortRef.current = controller
    const result = await runBatch(contacts, provider, key, {
      signal: controller.signal,
      onProgress: (done, total) => setProgress({ done, total }),
      onBatchStart: (batch, totalBatches) =>
        setBatchInfo(`Contacting the AI - batch ${batch} of ${totalBatches}`)
    })
    setBatchInfo(null)
    const { contacts: cleaned, suggestions: sugg } = applyUpdates(contacts, result.updates)
    setContacts(cleaned)
    setSuggestions(sugg)
    setFailures(result.failures)
    setAborted(result.aborted)
    setScreen('results')
  }

  function handleRevert(id: string) {
    const orig = original.find((c) => c.id === id)
    if (!orig) return
    setContacts((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, fn: orig.fn, categories: orig.categories, orgComponents: orig.orgComponents, notes: orig.notes }
          : c
      )
    )
    setSuggestions((prev) => prev.filter((s) => s.id !== id))
  }

  function handleApplySuggestion(id: string) {
    const sugg = suggestions.find((s) => s.id === id)
    if (!sugg) return
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, notes: [sugg.suggested] } : c)))
    setSuggestions((prev) => prev.filter((s) => s.id !== id))
  }

  function handleEdit(id: string, patch: Partial<Contact>) {
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  function handleStartOver() {
    keyStore.clearKey()
    setScreen('upload')
    setContacts([])
    setOriginal([])
    setMergeGroups([])
    setSuggestions([])
    setFailures([])
    setAborted(false)
  }

  return (
    <>
      <main>
        <Brand />
        {screen === 'upload' && <UploadScreen onParsed={handleParsed} />}

      {screen === 'preview' && (
        <PreviewTable
          contacts={contacts}
          mergeGroups={mergeGroups}
          onCleanWithAI={() => setScreen('keysetup')}
          onManualPrompt={handleManualPrompt}
          onBack={() => setScreen('upload')}
        />
      )}

      {screen === 'keysetup' && (
        <KeySetup onReady={(id) => void startCleaning(id)} onBack={() => setScreen('preview')} />
      )}

      {screen === 'cleaning' && (
        <>
          <section className="card">
            <h2>Cleaning your contacts…</h2>
            <ProgressBar done={progress.done} total={progress.total} batchInfo={batchInfo} />
            <button className="danger" onClick={() => abortRef.current?.abort()}>
              Stop
            </button>
            <p className="muted">
              Stopping keeps the results received so far. You can review and download them.
            </p>
          </section>
          <EgressPanel />
        </>
      )}

      {screen === 'results' && providerId && (
        <>
          <ResultsScreen
            contacts={contacts}
            original={original}
            suggestions={suggestions}
            failures={failures}
            aborted={aborted}
            onRevert={handleRevert}
            onApplySuggestion={handleApplySuggestion}
            onEdit={handleEdit}
            onShowImport={() => setScreen('import')}
          />
          <EgressPanel />
        </>
      )}

        {screen === 'import' && <ImportInstructions onStartOver={handleStartOver} />}
      </main>
      <Footer />
    </>
  )
}
