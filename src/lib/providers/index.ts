import { GEMINI_ENDPOINT, GROQ_ENDPOINT, OPENROUTER_ENDPOINT, GROQ_MODEL, OPENROUTER_MODEL, GEMINI_MODELS_URL } from '../constants'
import { egress } from '../egress'
import type { LLMContactUpdate } from '../vcard/types'

export type ProviderId = 'gemini' | 'openrouter' | 'groq'

const TEST_TIMEOUT_MS = 8000
const CALL_TIMEOUT_MS = 60000

function withTimeout(signal: AbortSignal | undefined, ms: number): AbortSignal {
  const timeout = AbortSignal.timeout(ms)
  return signal ? AbortSignal.any([signal, timeout]) : timeout
}

export class ProviderError extends Error {
  status?: number
  raw?: string

  constructor(message: string, opts?: { status?: number; raw?: string }) {
    super(message)
    this.name = 'ProviderError'
    this.status = opts?.status
    this.raw = opts?.raw
  }
}

export interface Provider {
  id: ProviderId
  label: string
  keyFormat: RegExp
  endpoint: string
  keyUrl: string
  call(key: string, payload: string, signal?: AbortSignal): Promise<LLMContactUpdate[]>
  testKey(key: string): Promise<boolean>}

export function stripFences(text: string): string {
  const m = /^\s*```(?:json)?\s*([\s\S]*?)\s*```\s*$/.exec(text)
  return m ? m[1] : text
}

export function parseUpdates(text: string): LLMContactUpdate[] {
  const parsed = JSON.parse(stripFences(text)) as { updates?: unknown }
  if (!parsed || !Array.isArray(parsed.updates)) {
    throw new Error('Response JSON has no updates array')
  }
  return parsed.updates as LLMContactUpdate[]
}

async function readResponseText(res: Response): Promise<string> {
  if (!res.ok) {
    const raw = await res.text().catch(() => '')
    let detail = ''
    try {
      const parsed = JSON.parse(raw) as { error?: { message?: string } }
      if (parsed?.error?.message) detail = `: ${parsed.error.message}`
    } catch {
      /* body was not JSON error shape — keep generic message */
    }
    throw new ProviderError(`Provider returned HTTP ${res.status}${detail}`, { status: res.status, raw })
  }
  return res.text()
}

const GEMINI_KEY_RE = /^AIza[A-Za-z0-9_-]{20,}$/
const GROQ_KEY_RE = /^gsk_[A-Za-z0-9_-]{20,}$/
const OPENROUTER_KEY_RE = /^sk-or-[A-Za-z0-9_-]{20,}$/

export const gemini: Provider = {
  id: 'gemini',
  label: 'Google Gemini',
  keyFormat: GEMINI_KEY_RE,
  endpoint: GEMINI_ENDPOINT,
  keyUrl: 'https://aistudio.google.com/app/apikey',
  async call(key, payload, signal) {
    const res = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: payload }] }],
        generationConfig: { responseMimeType: 'application/json' }
      }),
      signal: withTimeout(signal, CALL_TIMEOUT_MS)
    })
    const text = await readResponseText(res)
    let content: string
    try {
      const wire = JSON.parse(text) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[]
      }
      content = wire.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
      return parseUpdates(content)
    } catch (err) {
      if (err instanceof ProviderError) throw err
      throw new ProviderError('The AI returned an unreadable response', { raw: text })
    }
  },
  async testKey(key) {
    const res = await fetch(GEMINI_MODELS_URL, {
      method: 'GET',
      headers: { 'x-goog-api-key': key },
      signal: withTimeout(undefined, TEST_TIMEOUT_MS)
    })
    egress.record({
      provider: 'gemini',
      endpoint: GEMINI_MODELS_URL,
      requestBytes: 0,
      contactsSent: 0,
      fieldsStripped: [],
      status: res.status
    })
    if (!res.ok) {
      const raw = await res.text().catch(() => '')
      throw new ProviderError(`Provider returned HTTP ${res.status}`, { status: res.status, raw })
    }
    return true
  }
}

interface OpenAIChoice {
  message?: { content?: string }
}

function openAICompat(
  id: ProviderId,
  label: string,
  endpoint: string,
  model: string,
  keyFormat: RegExp,
  keyUrl: string,
  keyCheckUrl: string,
  extraHeaders: Record<string, string> = {}
): Provider {
  return {
    id,
    label,
    keyFormat,
    endpoint,
    keyUrl,
    async call(key, payload, signal) {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
          ...extraHeaders
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: payload }],
          response_format: { type: 'json_object' }
        }),
        signal: withTimeout(signal, CALL_TIMEOUT_MS)
      })
      const text = await readResponseText(res)
      try {
        const wire = JSON.parse(text) as { choices?: OpenAIChoice[] }
        const content = wire.choices?.[0]?.message?.content ?? ''
        return parseUpdates(content)
      } catch (err) {
        if (err instanceof ProviderError) throw err
        throw new ProviderError('The AI returned an unreadable response', { raw: text })
      }
    },
    async testKey(key) {
      const res = await fetch(keyCheckUrl, {
        method: 'GET',
        headers: { Authorization: `Bearer ${key}` },
        signal: withTimeout(undefined, TEST_TIMEOUT_MS)
      })
      egress.record({
        provider: id,
        endpoint: keyCheckUrl,
        requestBytes: 0,
        contactsSent: 0,
        fieldsStripped: [],
        status: res.status
      })
      if (!res.ok) {
        const raw = await res.text().catch(() => '')
        throw new ProviderError(`Provider returned HTTP ${res.status}`, { status: res.status, raw })
      }
      return true
    }
  }
}

export const groq: Provider = openAICompat(
  'groq',
  'Groq',
  GROQ_ENDPOINT,
  GROQ_MODEL,
  GROQ_KEY_RE,
  'https://console.groq.com/keys',
  'https://api.groq.com/openai/v1/models'
)

export const openrouter: Provider = openAICompat(
  'openrouter',
  'OpenRouter',
  OPENROUTER_ENDPOINT,
  OPENROUTER_MODEL,
  OPENROUTER_KEY_RE,
  'https://openrouter.ai/keys',
  'https://openrouter.ai/api/v1/key',
  { 'X-Title': 'PhoneBook Contact Cleaner' }
)

export const PROVIDERS: Record<ProviderId, Provider> = {
  gemini,
  groq,
  openrouter
}
