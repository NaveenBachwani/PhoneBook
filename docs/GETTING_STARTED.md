# Getting started with PhoneBook

A short guide to what PhoneBook actually does to your contacts - so you always know what
changes, what never changes, and how to undo things.

## What does "cleaning" do, exactly?

PhoneBook does two kinds of work:

**Without AI (always runs, no key needed):**

- **Duplicate merging.** If two contacts share the same phone number (last 10 digits) or email
  address, they are merged into one. Nothing is deleted - phones, emails, addresses, notes and
  categories from both are kept, and the fuller record becomes the surviving contact. You see
  every merge in the preview before anything happens.

**With AI (only when you click "Clean with AI" with your own key):**

- **Name fixing.** `RAM K SHARMA` becomes `Ram K. Sharma`; job titles, emoji decoration and
  trailing "work"/"mobile"/"old" suffixes are removed. The AI cleans the existing name - it
  never replaces it.
- **Category suggestion.** Each contact gets at most one tag from a fixed list
  (family, friend, work, service, medical, school, vendor) - appended to the contact's existing
  tags, never replacing them. Unsure contacts get no tag rather than a wrong guess.
- **Note tidying.** Suggested only, never applied silently: duplicated lines and obvious junk
  ("old number", repeated addresses) are removed while meaningful context is kept. You accept or
  reject each note suggestion individually.
- **Organization fill-in.** Only when the email domain clearly indicates an employer
  (`@acme.io` → "Acme") *and* the organization field was empty.

**What the AI never sees:** phone numbers, addresses, birthdays and photos are removed before
anything is sent. Names, emails and notes go directly from your browser to the AI provider you
chose - never to us. Every request is logged in the "Network activity" panel.

Already have edits you care about? Your existing notes and tags are **kept by default**. Every
change stays revertible until the moment you download the cleaned file.

## What if my contacts are already clean?

You still get value from step one: PhoneBook will find and merge duplicate contacts - the one
mess that survives even tidy address books. Everything else leaves your data alone:

- Without AI, clean contacts pass through essentially unchanged (the file is re-generated in
  standard vCard format).
- With AI, name and category suggestions still run, but on a clean address book they mostly
  confirm what is already there.
- Skip AI entirely with **"Get manual prompt"** - no key needed - or just download the
  deduplicated file from the preview.

## Customizing the AI behaviour (for self-hosters)

PhoneBook is 100% static - there is no server config. If you run your own copy
(`npm install && npm run dev`, or deploy `dist/` anywhere), you can change what the AI does by
editing two files and rebuilding:

**The instruction prompt** - `src/lib/prompt.ts`, the `SYSTEM_PROMPT` constant. This is the
task description sent with every batch. Edit it to make the AI do something else (sort
different, rewrite differently, extract different fields), then run `npm run build` (or push -
Netlify redeploys automatically). The manual-prompt download uses the same prompt.

**The category list** - `src/lib/constants.ts`, the `CATEGORIES` array. The prompt advertises
exactly these tags, and any AI response outside the list is discarded, so the two stay in sync
automatically. Keep `other` in the list: it is the prompt's "uncertain" fallback and is never
written to a contact. Categories are only ever appended, so changing the list is safe with old
data.

Two invariants to preserve when editing: the AI must return the same number of updates it
received, and note text is a suggestion until accepted - the app enforces both.

## See also

- [Privacy, in plain words](../README.md#privacy-in-plain-words) - what is sent, what is not
- [Architecture](ARCHITECTURE.md) - how the app is built
- [Rollback guide](rollback-guide.md) - undoing a bad import in Google Contacts
