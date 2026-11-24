import { useRef, useState } from 'react'
import { parseVCard } from '../lib/vcard/parse'
import type { ParseResult } from '../lib/vcard/types'
import InfoTip from './InfoTip'

interface Props {
  onParsed: (result: ParseResult) => void
}

export default function UploadScreen({ onParsed }: Props) {
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ParseResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setError(null)
    if (!/\.vcf$/i.test(file.name)) {
      setError('That does not look like a .vcf file. Export from Google Contacts using the vCard format.')
      return
    }
    try {
      const text = await file.text()
      const parsed = parseVCard(text)
      if (parsed.contacts.length === 0) {
        setError('No contacts found in this file. Make sure you exported contacts (not calendar or mail).')
        return
      }
      setResult(parsed)
    } catch {
      setError('We could not read this file. Is it a valid vCard export?')
    }
  }

  return (
    <section className="card">
      <h1>Clean up your Google Contacts</h1>
      <p className="muted">
        Fixes messy names, suggests categories, tidies duplicate junk in notes - then gives you a
        clean file to import back.
      </p>
      <div className="privacy">
        This page runs entirely in your browser. Your contact file is never uploaded to us.
        When you later run <strong>Clean with AI</strong>, names, emails and notes go directly to the
        AI provider you choose; phones, addresses and photos do not.
      </div>
      <InfoTip />
      <div
        className={`dropzone${dragOver ? ' active' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const file = e.dataTransfer.files[0]
          if (file) void handleFile(file)
        }}
      >
        <p><strong>Drop your .vcf file here</strong> or click to choose a file</p>
        <p className="muted">
          Don't have one? Open contacts.google.com on your computer, click the Export button
          (upward-arrow icon at the top of your contacts list) and choose the vCard format.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".vcf,text/vcard"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleFile(file)
          }}
        />
      </div>
      {error && <p className="badge warn" style={{ padding: '0.5rem 0.75rem' }}>{error}</p>}
      {result && (
        <>
          <p>
            Found <strong>{result.contacts.length}</strong> contacts.
            {result.errors.length > 0 && (
              <> {result.errors.length} line(s) could not be understood - they will be preserved unchanged.</>
            )}
          </p>
          <button className="primary" onClick={() => onParsed(result)}>
            Preview &amp; continue
          </button>
        </>
      )}
    </section>
  )
}
