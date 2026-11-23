interface Props {
  done: number
  total: number
}

export default function ProgressBar({ done, total }: Props) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <div>
      <div className="progress-outer">
        <div className="progress-inner" style={{ width: `${pct}%` }} />
      </div>
      <p className="muted">
        Cleaning {done} of {total} ({pct}%)
      </p>
    </div>
  )
}
