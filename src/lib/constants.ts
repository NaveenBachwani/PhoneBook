export const CATEGORIES = ['family', 'friend', 'work', 'service', 'medical', 'school', 'vendor', 'other'] as const
export type Category = (typeof CATEGORIES)[number]

export const BATCH_SIZE = 50
export const BATCH_DELAY_MS = 1200
export const MAX_RETRIES = 2
export const BACKOFF_BASE_MS = 2000
export const BACKOFF_MAX_MS = 30000

export const EXPORT_MAX_CONTACTS = 3000
export const EXPORT_MAX_BYTES = 20 * 1024 * 1024
export const NOTE_SAFE_LENGTH = 1000

export const GEMINI_MODEL = 'gemini-2.0-flash'
export const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
export const GROQ_MODEL = 'llama-3.3-70b-versatile'
export const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'
export const OPENROUTER_MODEL = 'meta-llama/llama-3.3-70b-instruct:free'
export const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'

export const CSP_CONNECT_SOURCES = [
  'https://generativelanguage.googleapis.com',
  'https://openrouter.ai',
  'https://api.groq.com'
]
