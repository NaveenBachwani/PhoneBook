export interface ContactName {
  family?: string
  given?: string
  additional?: string
  prefix?: string
  suffix?: string
}

export interface ContactPoint {
  value: string
  type?: string
}

export interface ContactAddress {
  type?: string
  components: string[]
}

export interface Contact {
  id: string
  fn: string
  n?: ContactName
  orgComponents?: string[]
  title?: string
  emails: ContactPoint[]
  phones: ContactPoint[]
  addresses: ContactAddress[]
  notes: string[]
  categories: string[]
  bdayLine?: string
  photoLine?: string
  uidLine?: string
  revLine?: string
  rawLines: string[]
  mergedFromIds?: string[]
}

export interface ParseError {
  line: number
  message: string
}

export interface ParseResult {
  contacts: Contact[]
  errors: ParseError[]
}

export interface LLMContactUpdate {
  id: string
  cleaned_fn: string
  category: string
  cleaned_note?: string
  enriched_org?: string
  merged_from?: string[]
}
