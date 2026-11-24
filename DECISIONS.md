# DECISIONS

Public-safe design decisions and judgments made while building Tier 1.
Format: decision - reason. Newest first.

- **Provider model IDs follow rolling aliases and are verified against live provider docs** - 
  the spec's `gemini-2.0-flash` was found shut down in production use (404 masquerading as a
  "bad key"). Gemini now uses Google's `gemini-flash-latest` alias (auto-tracks the current
  Flash model, 2-week email notice before swaps); Groq moved to `openai/gpt-oss-120b`
  (`llama-3.3-70b-versatile` became Enterprise-gated for free plans); OpenRouter's default is
  re-picked from the live `/api/v1/models` free list when it changes. Key-test failures are
  status-aware (404 = model unavailable, 429 = free tier busy, 401/403 = key rejected) so a
  dead model can never fake a bad key again.

- **Independent audit pass before first release** - an adversarial review of the finished code
  (network egress, key handling, payload whitelist, retention invariants, crash paths) confirmed
  the privacy claims and drove hardening: duplicate merges now carry the duplicate's structured
  name (`N`), a malformed unterminated card no longer discards its data when another card follows,
  AI-added tags are validated against the fixed category list, the service worker refreshes the
  shell network-first (offline fallback intact), the CSP blocks third-party image loads, and
  contact IDs have a secure-context fallback so parsing cannot crash on plain-HTTP hosting.

- **Dedup merge unions contact points** - the survivor of a duplicate pair gets the union of
  phones/emails/addresses (deduped by normalized value), not just "the best record". Merging must
  never delete a phone number or note. Phone normalization keeps the last 10 digits (Indian
  +91/0-prefix formats collapse correctly); known edge: numbers from different countries can
  collide on last-10 - accepted for v1, revisit if it bites.
- **LLM-side fuzzy merge cut from Tier 1** - the original spec let the AI merge similar contacts
  (`merged_from`), but nothing identified candidates for it, and merging without an un-merge UI is
  risky. Exact-match client-side dedup covers the common case; fuzzy merge is a Tier 2 item.
- **Notes are never silently replaced or truncated** - AI note cleanup appears as a per-row
  suggestion the user applies explicitly (revertable until download). Notes longer than 1,000
  characters are preserved and flagged (Google may truncate around 1,024 on import) instead of
  being cut by the app. Existing tags are never removed; the AI category is added on top.
- **API key is memory-only in v1** - the key lives in the browser tab and dies with the tab. The
  specced "remember on this device" (passphrase + encrypted IndexedDB) moves to a fast-follow:
  simpler UX now, no passphrase-recovery support burden, minimal risk window.
- **Hand-rolled vCard parser/generator** (no library) - the round-trip contract ("nothing in,
  nothing changed, except what you approved") is easier to guarantee when unknown properties are
  preserved verbatim; available browser-ready libraries normalize aggressively. Escape hatch
  retained: switch to a library if the real-Google reimport test fails three times.
- **Round-trip is tested automatically** - parse → generate → parse is asserted semantically
  equal in unit tests (plus a 221-contact corpus test and a byte-level fixed-point test), so the
  manual reimport test guards the last mile, not every regression.
- **Gemini uses responseMimeType (no responseSchema)** - JSON mime enforcement plus strict
  response validation covers structural failures; the schema adds complexity without removing the
  need for validation/retry.
- **Provider model IDs live in one constants file** - models rotate often; one file to touch.
- **Multi-NOTE source cards** are joined into a single NOTE on output with a newline (vCard
  allows several; Google shows them concatenated).
- **Unrecognized/malformed lines are preserved verbatim** as raw properties on output rather than
  dropped, and reported as parse warnings in the UI.
- **Planned addition: note "Added by PhoneBook" boundary** - when future versions append new
  information to a note, it goes below a dated marker line; re-runs replace the marked section
  instead of stacking (idempotent). Present in v1 as a tested utility; enrichment currently goes
  to the ORG field, not the note.
- **Hosting: Netlify free tier** - static hosting with custom headers (CSP), deploys from GitHub,
  free tier allows commercial use. The app is fully static; the same `dist/` folder can be hosted
  anywhere (e.g., a shared-hosting subdomain) without changes.
- **Refresh guard while contacts are in memory** - the app warns before an accidental tab close
  during cleaning/results; there is no server-side session to return to.
