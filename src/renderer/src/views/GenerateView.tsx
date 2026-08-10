import { useEffect, useState } from 'react'
import type { GenerateJobConfig, GenerateProgress, GenerateRowResult } from '@shared/types'
import { IconArrowBack, IconClose, IconFolderOpen, IconPlayArrow, IconRefresh } from '../components/Icon'

interface Props {
  jobBase: Omit<GenerateJobConfig, 'outputDir'>
  onBack: () => void
  onRestart: () => void
}

export default function GenerateView({ jobBase, onBack, onRestart }: Props): JSX.Element {
  const [outputDir, setOutputDir] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelled, setCancelled] = useState(false)
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
    setCancelled(false)
    setFailures([])
    try {
      const completed = await window.api.startGenerate({ ...jobBase, outputDir })
      if (!completed) setCancelled(true)
    } finally {
      setRunning(false)
      setCancelling(false)
    }
  }

  async function cancel(): Promise<void> {
    setCancelling(true)
    await window.api.cancelGenerate()
  }

  const pct = progress && progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0

  return (
    <div className="view">
      <h2>Generate batch</h2>

      <div className="output-dir-row">
        <button onClick={pickOutputDir} disabled={running}>
          <IconFolderOpen /> Choose output folder…
        </button>
        {outputDir && <span>{outputDir}</span>}
      </div>

      <div className="nav-row">
        <button onClick={start} disabled={!outputDir || running}>
          {running ? (
            'Generating…'
          ) : (
            <>
              <IconPlayArrow /> Start generation
            </>
          )}
        </button>
        {running && (
          <button onClick={cancel} disabled={cancelling}>
            {cancelling ? (
              'Cancelling…'
            ) : (
              <>
                <IconClose /> Cancel
              </>
            )}
          </button>
        )}
      </div>

      {progress && (
        <div className="progress">
          <progress value={pct} max={100} />
          <p>
            {progress.completed} of {progress.total} done, {progress.succeeded} succeeded, {progress.failed} failed
          </p>
          {cancelled && (
            <div>
              <p>Cancelled — {progress.completed} of {progress.total} rows were generated before stopping.</p>
              <div className="nav-row">
                <button onClick={() => outputDir && window.api.openOutputDir(outputDir)}>
                  <IconFolderOpen /> Open output folder
                </button>
                <button onClick={onRestart}>
                  <IconRefresh /> Start another batch
                </button>
              </div>
            </div>
          )}
          {progress.done && !cancelled && (
            <div>
              <p>Done.</p>
              <div className="nav-row">
                <button onClick={() => outputDir && window.api.openOutputDir(outputDir)}>
                  <IconFolderOpen /> Open output folder
                </button>
                <button onClick={onRestart}>
                  <IconRefresh /> Start another batch
                </button>
              </div>
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

      {!running && (
        <button onClick={onBack}>
          <IconArrowBack /> Back
        </button>
      )}
    </div>
  )
}
