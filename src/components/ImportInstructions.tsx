interface Props {
  onStartOver: () => void
}

export default function ImportInstructions({ onStartOver }: Props) {
  return (
    <>
      <section className="card">
        <h2>Import into Google Contacts</h2>
        <div className="privacy">
          <strong>Step 0 - keep a backup first.</strong> On contacts.google.com: use the
          <strong> Export</strong> control (the upward-arrow button at the top of your contacts
          list) → export ALL contacts as vCard. Save that file somewhere safe. If anything looks
          wrong after importing, that backup is your way back.
        </div>
        <ol className="steps">
          <li>Open <a href="https://contacts.google.com" target="_blank" rel="noreferrer">contacts.google.com</a> on your computer.</li>
          <li>Click <strong>Import</strong> - at the top of your contacts list, or in the left sidebar depending on the layout.</li>
          <li>Select the cleaned file you just downloaded (e.g. contacts-cleaned.vcf).</li>
          <li>Click <strong>Import</strong>.</li>
        </ol>
        <p className="muted">
          Google limits imports to 3,000 contacts per file and 20 MB per file. If your list is
          larger, the app already split it into multiple files - import them one after another.
        </p>
      </section>

      <section className="card">
        <h2>Good to know before you import</h2>
        <ul>
          <li>
            <strong>Importing adds contacts - it never overwrites.</strong> Your cleaned contacts
            will appear <em>alongside</em> your existing ones, not replace them.
          </li>
          <li>
            <strong>Your notes and tags were kept.</strong> Anything the AI added sits next to your
            original text, and new tags were added to your existing ones.
          </li>
          <li>
            <strong>Prefer the import to replace what's there?</strong> Delete the old copies
            first (or import into a freshly emptied account), then import the cleaned file.
          </li>
        </ul>
      </section>

      <section className="card">
        <h2>If something went wrong (rollback)</h2>
        <ol className="steps">
          <li>
            <strong>Undo an import:</strong> contacts.google.com → select the contacts you just
            imported (sort by "Recently added" or select all → filter) → click the three-dot menu →
            <strong> Delete</strong>. They move to Trash.
          </li>
          <li>
            <strong>Restore anything else:</strong> Trash keeps deleted contacts for 30 days - 
            select and "Recover" if something important landed there by accident.
          </li>
          <li>
            <strong>Worst case:</strong> delete the imported batch, then import the Step-0 backup
            file you exported before starting. You're back to exactly where you began.
          </li>
        </ol>
        <div className="toolbar">
          <button onClick={onStartOver}>Clean another file</button>
        </div>
      </section>
    </>
  )
}
