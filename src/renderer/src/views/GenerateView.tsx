import { useEffect, useState } from 'react'
import type { GenerateJobConfig, GenerateProgress, GenerateRowResult } from '@shared/types'

interface Props {
  jobBase: Omit<GenerateJobConfig, 'outputDir'>
  onBack: () => void
  onRestart: () => void
}

export default function GenerateView({ jobBase, onBack, onRestart }: Props): JSX.Element {
  const [outputDir, setOutputDir] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<GenerateProgress | null>(null)
  const [failures, setFailures] = useState<GenerateRowResult[]>([])

  useEffect(() => {
    const offProgress = window.api.onGenerateProgress(setProgress)
    const offRow = window.api.onGenerateRowResult((r) => {
      if (r.status === 'failed') setFailures((f) => [...f, r])
    })
    return () => {
      offProgress()
      offRow()
    }
  }, [])

  useEffect(() => {
    window.api.getSettings().then((s) => {
      if (s.defaultOutputDir) setOutputDir(s.defaultOutputDir)
    })
  }, [])

  async function pickOutputDir(): Promise<void> {
    const dir = await window.api.selectOutputDir()
    if (dir) setOutputDir(dir)
  }

  async function start(): Promise<void> {
    if (!outputDir) return
    setRunning(true)
    setFailures([])
    try {
      await window.api.startGenerate({ ...jobBase, outputDir })
    } finally {
      setRunning(false)
    }
  }

  const pct = progress && progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0

  return (
    <div className="view">
      <h2>Generate batch</h2>

      <div className="output-dir-row">
        <button onClick={pickOutputDir} disabled={running}>
          Choose output folder…
        </button>
        {outputDir && <span>{outputDir}</span>}
      </div>

      <button onClick={start} disabled={!outputDir || running}>
        {running ? 'Generating…' : 'Start generation'}
      </button>

      {progress && (
        <div className="progress">
          <progress value={pct} max={100} />
          <p>
            {progress.completed} / {progress.total} — {progress.succeeded} succeeded, {progress.failed} failed
          </p>
          {progress.done && (
            <div>
              <p>Done.</p>
              <button onClick={() => outputDir && window.api.openOutputDir(outputDir)}>Open output folder</button>
              <button onClick={onRestart}>Start another batch</button>
            </div>
          )}
        </div>
      )}

      {failures.length > 0 && (
        <details>
          <summary>{failures.length} failed rows</summary>
          <ul>
            {failures.map((f) => (
              <li key={f.rowIndex}>
                Row {f.rowIndex + 1} ({f.rowLabel ?? 'unknown'}): {f.error}
              </li>
            ))}
          </ul>
        </details>
      )}

      {!running && <button onClick={onBack}>Back</button>}
    </div>
  )
}
