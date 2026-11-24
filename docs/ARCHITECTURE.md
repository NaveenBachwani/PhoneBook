# Architecture

PhoneBook is a 100% static Progressive Web App. There is no backend, no database, and no
server-side state: the deployed artifact is HTML, JS, CSS and a service worker. For a
non-technical walkthrough of what the app does to your contacts, see the
[getting started guide](GETTING_STARTED.md).

## The one-sentence version

The browser reads your `.vcf` file, shows you what it found, sends only names/emails/notes to the
AI provider you chose (using your own API key), and writes a new `.vcf` file - every byte of your
original data is preserved unless you explicitly approve a change.

## Data flow

```
.vcf file (user's device)
        │  File API - never uploaded
        ▼
┌──────────────────────────────┐
│ vcard/parse.ts               │  tolerant vCard 2.1/3.0/4.0 reader:
│   Contact[]                  │  folding, quoted-printable, grouped props,
│   (+ rawLines: verbatim)     │  unknown properties kept byte-for-byte
└──────────┬───────────────────┘
           ▼
┌──────────────────────────────┐
│ vcard/dedupe.ts              │  exact-match duplicates (phone/email);
│   merged Contact[]           │  merge = UNION of contact points + notes
└──────────┬───────────────────┘
           ▼
┌──────────────────────────────┐        ┌───────────────────────────┐
│ prompt.ts → batch.ts         │ fetch  │ AI provider (user's key): │
│   payload strips phones,     ├────────► gemini / groq /          │
│   addresses, bday, photo     │        │ openrouter                │
│   egress.ts logs every call  │◄───────┤ JSON { updates: [...] }   │
└──────────┬───────────────────┘        └───────────────────────────┘
           ▼
┌──────────────────────────────┐
│ apply.ts + ResultsScreen     │  user reviews every change,
│   editable, per-row revert   │  can apply/decline note suggestions
└──────────┬───────────────────┘
           ▼
┌──────────────────────────────┐
│ vcard/generate.ts            │  vCard 3.0, CRLF, 75-octet folding,
│   .vcf (+ split >3000)       │  strict escaping - reimports into Google
│ export.ts → .csv (view-only) │
└──────────────────────────────┘
```

## UI layer

React screens drive the flow: upload → preview → key setup → cleaning (progress + Stop) →
results (per-row edit/revert/apply) → import instructions. Shared chrome: a brand header, a
"what does cleaning do?" info tip (short answer inline, link to the
[getting started guide](GETTING_STARTED.md)) on the upload and preview screens, and a site
footer on every screen. The network activity (egress) panel is shown alongside cleaning and
results.

## The retention contract (invariants, enforced by tests)

1. No property is dropped - unmodeled properties re-emit verbatim (`rawLines`).
2. Existing note text is immutable by default; additions only ever append below a dated
   "Added by PhoneBook" marker (idempotent replacement of the marked section); AI note cleanups
   apply only on explicit per-row user action and are revertable until download.
3. Existing tags (CATEGORIES) are never removed; AI categories are added.
4. Notes are never silently truncated - long notes warn instead.
5. Merging duplicates never deletes contact points; it unions them.
6. All destructive changes (note cleanup, name changes) are explicit, per-row, and revertable
   until download.

## Key handling

The API key lives in a module-level variable (`keyStore.ts`) - browser memory only. It is sent
exclusively to the provider endpoint chosen by the user. It is never stored, never logged, and
cleared when the tab closes. "Remember on this device" (encrypted IndexedDB) is a planned
fast-follow.

## Security posture

- CSP (`netlify.toml`) pins `connect-src` to the three provider domains - any other outbound call
  is blocked by the browser, providing a hard backstop to the app code.
- `script-src 'self'` - no third-party scripts, no analytics, no error-reporting services.
- The egress panel logs every outbound request (domain, count, bytes, fields stripped) and can
  show the exact payload of the last request - the app's trust anchor.
- The service worker caches only the app shell, never API responses, and never touches
  cross-origin requests.

## vCard engine notes

- **Parsing**: line unfolding (including quoted-printable soft breaks), GROUP-prefixed properties
  (`item1.TEL`), 2.1-style bare parameters, quoted-printable decoding with charset support.
- **Generation**: vCard 3.0 (Google's most reliable import format), CRLF, folding at 75 octets on
  UTF-8-safe boundaries, strict escaping (`\,` `\;` `\\` `\n`), one `FN`/`N`/`NOTE` per card.
- **Testing**: parse→generate→parse round-trip equality on fixtures (folded QP notes, base64
  photos, Unicode names, multi-note cards, 2.1 files) plus a 221-contact corpus and a byte-level
  fixed-point test (`generate(parse(generate(x))) === generate(x)`).
