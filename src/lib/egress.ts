export interface EgressEntry {
  timestamp: number
  provider: string
  endpoint: string
  requestBytes: number
  contactsSent: number
  fieldsStripped: string[]
  status: number
}

export interface EgressSummaryRow {
  domain: string
  count: number
  bytes: number
}

const log: EgressEntry[] = []

let lastPayloadText: string | null = null

export const egress = {
  record(entry: Omit<EgressEntry, 'timestamp'>): void {
    log.push({ ...entry, timestamp: Date.now() })
  },
  recordPayload(payload: string): void {
    lastPayloadText = payload
  },
  lastPayload(): string | null {
    return lastPayloadText
  },
  entries(): readonly EgressEntry[] {
    return log
  },
  summary(): EgressSummaryRow[] {
    const map = new Map<string, EgressSummaryRow>()
    for (const e of log) {
      let domain: string
      try {
        domain = new URL(e.endpoint).hostname
      } catch {
        domain = e.endpoint
      }
      const row = map.get(domain) ?? { domain, count: 0, bytes: 0 }
      row.count++
      row.bytes += e.requestBytes
      map.set(domain, row)
    }
    return [...map.values()]
  },
  clear(): void {
    log.length = 0
    lastPayloadText = null
  }
}
