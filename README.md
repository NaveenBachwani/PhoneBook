# PhoneBook

> I am new to programming, but love using Technology in daily life and work! Through this
> project, I am sharing a useful utility that has been created under my direction with the help
> of AI. Do bear in mind that this is a work in progress, and will continue to improve. I hope
> it can help you make the most of your phonebook, as it does for me.
>
> This repository is being made available in the spirit of open source. Readers are advised to
> use the commands and instructions here with care. The creator accepts no responsibility for
> system damage, data loss or other consequences resulting from their use.
>
> For more advanced ideas, decisions and lessons from building with AI:
> Project KnowHow @ <http://knowhow.thinkshop.in>

Clean up and enrich a Google Contacts export on your own computer — free, private, no sign-up.

PhoneBook reads the `.vcf` file you export from [contacts.google.com](https://contacts.google.com),
fixes messy names, suggests categories (family / friend / work / medical / …), tidies duplicate
junk in notes, and gives you a clean file to import back. Your AI account (Gemini, Groq or
OpenRouter) does the thinking — you bring your own free API key.

## Privacy, in plain words

- Your contact file **never leaves your device**. There is no server, no account, no tracking.
- When you choose "Clean with AI", **names, emails and notes** are sent directly from your browser
  to the AI provider you picked. **Phones, addresses, birthdays and photos are not sent.**
- Your API key stays in this browser tab's memory and is forgotten when you close the tab.
- Every request is logged in an "Egress" panel you can open at any time — nothing hidden.
- Your existing notes and tags are **kept by default**. A tidier AI version of a note applies
  only when you click to accept it (and you can revert until download); anything new the AI adds
  is placed under a dated "Added by PhoneBook" marker; and you review every change before
  downloading.

## How to use it

1. Open the app in your browser.
2. Export contacts from [contacts.google.com](https://contacts.google.com) — click the **Export**
   button (the upward-arrow icon at the top of your contacts list; older layouts have it in the
   left sidebar) and choose **vCard (.vcf)** format — not Google CSV.
3. Drop the `.vcf` file into PhoneBook and preview what was found.
4. Get a free API key (Gemini is the easiest — the app links you to it), paste it in.
5. Click **Clean with AI**. Review the results, undo anything you disagree with.
6. Download the cleaned `.vcf` and import it back at contacts.google.com.
   The app walks you through it — including how to keep a backup first and how to undo.

## For developers

```bash
npm install
npm run dev      # local dev server
npm test         # unit tests
npm run lint     # eslint
npm run build    # production build into dist/
```

- 100% static: no backend, no database, no environment secrets.
- Stack: Vite + React + TypeScript, hand-rolled vCard parser (see `docs/ARCHITECTURE.md`).

## License

[AGPL-3.0](LICENSE) — free to use and modify; modifications offered as a network service must
share their source. The author retains the right to license the code on other terms.
