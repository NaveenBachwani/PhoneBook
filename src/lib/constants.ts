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

// Model IDs rotate often — these are checked against provider docs when touched.
// Primary models favor high-throughput, low-demand models for free-tier reliability.
// On overload (503/429) or retirement (404), providers fall back to the next model.
export const GEMINI_MODEL = 'gemini-3.5-flash-lite'
export const GEMINI_FALLBACK_MODELS = ['gemini-flash-latest']
export const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
export const GEMINI_MODELS_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
export const GROQ_MODEL = 'openai/gpt-oss-120b'
export const GROQ_FALLBACK_MODELS = ['openai/gpt-oss-20b']
export const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'
export const OPENROUTER_MODEL = 'google/gemma-4-31b-it:free'
export const OPENROUTER_FALLBACK_MODELS = ['google/gemma-4-26b-a4b-it:free']
export const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'

export const CSP_CONNECT_SOURCES = [
  'https://generativelanguage.googleapis.com',
  'https://openrouter.ai',
  'https://api.groq.com'
]
