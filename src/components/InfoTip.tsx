const GUIDE_URL = 'https://github.com/NaveenBachwani/PhoneBook/blob/main/docs/GETTING_STARTED.md'

export default function InfoTip() {
  return (
    <details className="infotip">
      <summary>What does cleaning do?</summary>
      <p>
        Duplicates sharing a phone or email are merged (nothing deleted). With AI: messy names
        get fixed, one category is suggested per contact, and note tidy-ups apply only when you
        accept them. Phones, addresses and photos are never sent to the AI. Already-clean
        contacts? Only duplicates are touched.
      </p>
      <p className="muted">
        <a href={GUIDE_URL} target="_blank" rel="noreferrer">
          Full getting-started guide ↗
        </a>
      </p>
    </details>
  )
}
