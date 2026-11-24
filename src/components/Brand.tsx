function Mark() {
  return (
    <svg className="brand-mark" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <rect x="2.5" y="3.5" width="19" height="17" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="9" cy="10" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5.2 17c.7-2 2.1-3 3.8-3s3.1 1 3.8 3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M15.5 9h3.5M15.5 12.5h3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export default function Brand() {
  return (
    <header className="brand">
      <Mark />
      <span className="brand-name">PhoneBook</span>
      <span className="brand-tag">your contacts, tidied - on your own computer</span>
    </header>
  )
}
