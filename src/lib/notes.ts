const MARKER_RE = /^=== Added by PhoneBook \(\d{4}-\d{2}-\d{2}\) ===$/m

export function todayMarker(): string {
  return `=== Added by PhoneBook (${new Date().toISOString().slice(0, 10)}) ===`
}

export function appendNewInfo(originalNote: string, additions: string): string {
  const clean = additions.trim()
  if (!clean) return originalNote
  const section = `${todayMarker()}\n${clean}`
  if (MARKER_RE.test(originalNote)) {
    return originalNote.replace(/=== Added by PhoneBook \(\d{4}-\d{2}-\d{2}\) ===[\s\S]*$/, section)
  }
  if (!originalNote.trim()) return section
  return originalNote.replace(/\s*$/, '') + '\n\n' + section
}

export function noteLengthWarning(note: string, limit = 1000): string | undefined {
  return note.length > limit
    ? `This note is ${note.length} characters. Google may truncate notes around 1,024 characters on import — review and trim it if needed.`
    : undefined
}
