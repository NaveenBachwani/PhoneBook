import type { Contact, LLMContactUpdate } from './vcard/types'
import type { Provider } from './providers'
import { ProviderError } from './providers'
import { buildPayload, STRIPPED_FIELDS } from './prompt'
import { egress } from './egress'
import { BATCH_SIZE, BATCH_DELAY_MS, MAX_RETRIES, BACKOFF_BASE_MS, BACKOFF_MAX_MS } from './constants'

const encoder = new TextEncoder()

export interface BatchFailure {
  batch: number
  reason: string
  raw?: string
}

export interface BatchResult {
  updates: LLMContactUpdate[]
  failures: BatchFailure[]
  aborted: boolean
}

export interface RunBatchOptions {
  onProgress?: (done: number, total: number) => void
  signal?: AbortSignal
  delayMs?: number
  batchSize?: number
  backoffBaseMs?: number
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

export function validateUpdates(
  input: Contact[],
  updates: LLMContactUpdate[]
): { valid: LLMContactUpdate[]; missingIds: string[] } {
  const ids = new Set(input.map((c) => c.id))
  const valid = updates.filter((u) => u && typeof u.id === 'string' && ids.has(u.id))
  const returned = new Set(valid.map((u) => u.id))
  const missingIds = input.filter((c) => !returned.has(c.id)).map((c) => c.id)
  return { valid, missingIds }
}

function backoffMs(attempt: number, baseMs: number): number {
  return Math.min(baseMs * 2 ** attempt, BACKOFF_MAX_MS)
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t)
        resolve()
      },
      { once: true }
    )
  })
}

interface CallOutcome {
  updates?: LLMContactUpdate[]
  error?: ProviderError
  aborted: boolean
}

async function callWithRetry(
  provider: Provider,
  key: string,
  payload: string,
  requestBytes: number,
  contactsSent: number,
  signal?: AbortSignal,
  backoffBaseMs = BACKOFF_BASE_MS
): Promise<CallOutcome> {
  const maxAttempts = MAX_RETRIES + 1
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (signal?.aborted) return { aborted: true }
    try {
      const updates = await provider.call(key, payload, signal)
      egress.record({
        provider: provider.id,
        endpoint: provider.endpoint,
        requestBytes,
        contactsSent,
        fieldsStripped: [...STRIPPED_FIELDS],
        status: 200
      })
      return { updates, aborted: false }
    } catch (err) {
      if (signal?.aborted || (err as Error).name === 'AbortError') return { aborted: true }
      const e =
        err instanceof ProviderError ? err : new ProviderError(`Unexpected error: ${String(err)}`)
      egress.record({
        provider: provider.id,
        endpoint: provider.endpoint,
        requestBytes,
        contactsSent,
        fieldsStripped: [...STRIPPED_FIELDS],
        status: e.status ?? 0
      })
      const retriesAllowed = e.status === 429 ? MAX_RETRIES : 1
      if (attempt < retriesAllowed) {
        await sleep(e.status === 429 ? backoffMs(attempt, backoffBaseMs) : 500, signal)
        continue
      }
      return { error: e, aborted: false }
    }
  }
  return { aborted: false, error: new ProviderError('Exhausted retries') }
}

export async function runBatch(
  contacts: Contact[],
  provider: Provider,
  key: string,
  opts: RunBatchOptions = {}
): Promise<BatchResult> {
  const batchSize = opts.batchSize ?? BATCH_SIZE
  const delayMs = opts.delayMs ?? BATCH_DELAY_MS
  const chunks = chunk(contacts, batchSize)
  const results: LLMContactUpdate[] = []
  const failures: BatchFailure[] = []
  let processed = 0
  let aborted = false

  for (let i = 0; i < chunks.length; i++) {
    if (opts.signal?.aborted) {
      aborted = true
      failures.push({ batch: i, reason: 'stopped by user' })
      break
    }
    const batch = chunks[i]
    const payload = buildPayload(batch)
    const requestBytes = encoder.encode(payload).length
    egress.recordPayload(payload)
    const outcome = await callWithRetry(
      provider,
      key,
      payload,
      requestBytes,
      batch.length,
      opts.signal,
      opts.backoffBaseMs
    )
    if (outcome.aborted) {
      aborted = true
      failures.push({ batch: i, reason: 'stopped by user' })
      break
    }
    if (outcome.error || !outcome.updates) {
      failures.push({
        batch: i,
        reason: outcome.error?.message ?? 'unknown error',
        raw: outcome.error?.raw
      })
      continue
    }
    const { valid, missingIds } = validateUpdates(batch, outcome.updates)
    results.push(...valid)
    if (missingIds.length) {
      failures.push({
        batch: i,
        reason: `Provider omitted ${missingIds.length} contact(s) — they will be left unchanged`
      })
    }
    processed += batch.length
    opts.onProgress?.(Math.min(processed, contacts.length), contacts.length)
    if (i < chunks.length - 1) await sleep(delayMs, opts.signal)
  }
  return { updates: results, failures, aborted }
}
