interface Props {
  done: number
  total: number
  batchInfo: string | null
}

export default function ProgressBar({ done, total, batchInfo }: Props) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <div>
      <div className="progress-outer">
        <div className="progress-inner" style={{ width: `${pct}%` }} />
      </div>
      <p className="muted">
        Cleaning {done} of {total} ({pct}%)
      </p>
      {batchInfo && (
        <p className="muted">{batchInfo} - a batch of contacts can take up to a minute.</p>
      )}
      <p className="muted">
        Click Stop any time: results received so far are kept, the rest stay unchanged.
      </p>
    </div>
  )
}
