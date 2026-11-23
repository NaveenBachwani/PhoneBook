import { beforeEach, describe, expect, it, vi } from 'vitest'
import { runBatch, validateUpdates } from './batch'
import { egress } from './egress'
import { gemini, openrouter } from './providers'
import { buildPayload, SYSTEM_PROMPT } from './prompt'
import type { Contact, LLMContactUpdate } from './vcard/types'

function makeContact(partial: Partial<Contact> = {}): Contact {
  return {
    id: crypto.randomUUID(),
    fn: 'Test Person',
    emails: [],
    phones: [],
    addresses: [],
    notes: [],
    categories: [],
    rawLines: [],
    ...partial
  }
}

function wireGemini(updates: unknown[]): string {
  return JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ updates }) }] } }] })
}

function updateFor(c: Contact): LLMContactUpdate {
  return { id: c.id, cleaned_fn: c.fn.toUpperCase(), category: 'other' }
}

const mockFetch = vi.fn()

beforeEach(() => {
  mockFetch.mockReset()
  vi.stubGlobal('fetch', mockFetch)
  egress.clear()
})

describe('buildPayload (field stripping)', () => {
  it('sends only id, name, org, title, emails, note — never phones/addresses/bday/photo', () => {
    const c = makeContact({
      fn: 'Ram Sharma',
      phones: [{ value: '+91 98765 43210' }],
      addresses: [{ components: ['', '', '12 MG Road', '', '', '', ''] }],
      bdayLine: 'BDAY:1990-04-15',
      photoLine: 'PHOTO;ENCODING=BASE64;TYPE=JPEG:AAAA',
      notes: ['met at conf', 'old line'],
      emails: [{ value: 'ram@acme.io' }]
    })
    const payload = JSON.parse(buildPayload([c])) as {
      contacts: Record<string, unknown>[]
      instructions: string
    }
    const sent = payload.contacts[0]
    expect(sent.id).toBe(c.id)
    expect(sent.fn).toBe('Ram Sharma')
    expect(sent.note).toBe('met at conf\nold line')
    expect(payload.instructions).toBe(SYSTEM_PROMPT)
    const serialized = JSON.stringify(payload)
    expect(serialized).not.toContain('98765 43210')
    expect(serialized).not.toContain('12 MG Road')
    expect(serialized).not.toContain('BDAY')
    expect(serialized).not.toContain('PHOTO')
    expect(serialized).not.toContain('phones')
  })
})

describe('runBatch', () => {
  it('runs happy path with progress and egress logging', async () => {
    const contacts = Array.from({ length: 4 }, () => makeContact())
    mockFetch.mockImplementation(() => new Response(wireGemini(contacts.map(updateFor)), { status: 200 }))
    const progress: [number, number][] = []
    const result = await runBatch(contacts, gemini, 'k', {
      batchSize: 2,
      delayMs: 1,
      onProgress: (d, t) => progress.push([d, t])
    })
    expect(result.updates).toHaveLength(4)
    expect(result.failures).toHaveLength(0)
    expect(result.aborted).toBe(false)
    expect(progress).toEqual([
      [2, 4],
      [4, 4]
    ])
    expect(mockFetch).toHaveBeenCalledTimes(2)
    const entry = egress.entries()[0]
    expect(entry.provider).toBe('gemini')
    expect(entry.endpoint).toContain('generativelanguage.googleapis.com')
    expect(entry.requestBytes).toBeGreaterThan(0)
    expect(entry.fieldsStripped).toEqual(['phones', 'addresses', 'bday', 'photo'])
    expect(entry.status).toBe(200)
  })

  it('marks provider-omitted contacts as failures and keeps the rest', async () => {
    const contacts = Array.from({ length: 2 }, () => makeContact())
    mockFetch.mockResolvedValue(new Response(wireGemini([updateFor(contacts[0])]), { status: 200 }))
    const result = await runBatch(contacts, gemini, 'k', { batchSize: 10 })
    expect(result.updates).toEqual([updateFor(contacts[0])])
    expect(result.failures[0].reason).toMatch(/omitted 1 contact/)
  })

  it('retries 429 with backoff and succeeds', async () => {
    const contacts = [makeContact()]
    mockFetch
      .mockImplementationOnce(() => new Response('rate limited', { status: 429 }))
      .mockImplementationOnce(() => new Response('rate limited', { status: 429 }))
      .mockImplementationOnce(() => new Response(wireGemini(contacts.map(updateFor)), { status: 200 }))
    const result = await runBatch(contacts, gemini, 'k', {
      batchSize: 10,
      delayMs: 1,
      backoffBaseMs: 1
    })
    expect(mockFetch).toHaveBeenCalledTimes(3)
    expect(result.updates).toHaveLength(1)
    expect(result.failures).toHaveLength(0)
  })

  it('fails with raw response for repeated malformed JSON', async () => {
    const contacts = [makeContact()]
    mockFetch
      .mockResolvedValueOnce(new Response('not json at all', { status: 200 }))
      .mockResolvedValueOnce(new Response('```json\n{"updates":"nope"}\n```', { status: 200 }))
    const result = await runBatch(contacts, gemini, 'k', { batchSize: 10, delayMs: 1 })
    expect(result.updates).toHaveLength(0)
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(result.failures[0].raw).toContain('updates')
  })

  it('maps unknown ids out and keeps valid ones', () => {
    const contacts = [makeContact(), makeContact()]
    const updates = [updateFor(contacts[0]), { id: 'bogus', cleaned_fn: 'X', category: 'other' }]
    const { valid, missingIds } = validateUpdates(contacts, updates)
    expect(valid).toEqual([updateFor(contacts[0])])
    expect(missingIds).toEqual([contacts[1].id])
  })

  it('stops on abort and returns partial results', async () => {
    const contacts = Array.from({ length: 4 }, () => makeContact())
    const controller = new AbortController()
    mockFetch.mockImplementation(
      () => new Response(wireGemini(contacts.map(updateFor)), { status: 200 })
    )
    const result = await runBatch(contacts, gemini, 'k', {
      batchSize: 2,
      delayMs: 1,
      signal: controller.signal,
      onProgress: () => controller.abort()
    })
    expect(result.updates).toHaveLength(2)
    expect(result.aborted).toBe(true)
  })

  it('surfaces 401 as failure with status', async () => {
    const contacts = [makeContact()]
    mockFetch.mockResolvedValue(new Response('denied', { status: 401 }))
    const result = await runBatch(contacts, gemini, 'k', { batchSize: 10, delayMs: 1 })
    expect(result.failures[0].reason).toContain('401')
    expect(result.updates).toHaveLength(0)
  })
})

describe('providers', () => {
  it('openrouter strips markdown fences', async () => {
    const c = makeContact()
    const fenced = '```json\n' + JSON.stringify({ updates: [updateFor(c)] }) + '\n```'
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: fenced } }] }), { status: 200 })
    )
    const updates = await openrouter.call('k', '{}')
    expect(updates).toHaveLength(1)
    expect(updates[0].id).toBe(c.id)
  })

  it('testKey reflects provider answer', async () => {
    mockFetch.mockResolvedValue(new Response('{}', { status: 200 }))
    expect(await gemini.testKey('good')).toBe(true)
    mockFetch.mockResolvedValue(new Response('denied', { status: 401 }))
    expect(await gemini.testKey('bad')).toBe(false)
  })
})
