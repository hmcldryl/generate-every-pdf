import { Fragment, useEffect, useState } from 'react'
import type { GenerationJobSummary, JobLogEntry } from '@shared/types'

export default function HistoryView(): JSX.Element {
  const [jobs, setJobs] = useState<GenerationJobSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [logs, setLogs] = useState<Record<string, JobLogEntry[]>>({})

  useEffect(() => {
    window.api
      .listGenerationJobs()
      .then(setJobs)
      .finally(() => setLoading(false))
  }, [])

  async function toggleExpand(jobId: string): Promise<void> {
    if (expanded === jobId) {
      setExpanded(null)
      return
    }
    setExpanded(jobId)
    if (!logs[jobId]) {
      const l = await window.api.getJobLogs(jobId)
      setLogs((prev) => ({ ...prev, [jobId]: l }))
    }
  }

  return (
    <div className="view">
      <h1>Generation history</h1>
      <p className="muted">Every batch run, with a per-row success/failure log for auditability.</p>

      {loading && <p className="muted">Loading…</p>}
      {!loading && jobs.length === 0 && <p className="muted">No batches run yet.</p>}

      {jobs.length > 0 && (
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Started</th>
              <th>Template</th>
              <th>Output</th>
              <th>Rows</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <Fragment key={j.id}>
                <tr className="clickable" onClick={() => toggleExpand(j.id)}>
                  <td>{expanded === j.id ? '▾' : '▸'}</td>
                  <td>{new Date(j.startedAt).toLocaleString()}</td>
                  <td>{j.templateId}</td>
                  <td className="field-key">{j.outputDir}</td>
                  <td>{j.total}</td>
                  <td>
                    {j.finishedAt ? (
                      <span className={j.failed > 0 ? 'badge warn' : 'badge ok'}>
                        {j.succeeded}/{j.total} ok
                      </span>
                    ) : (
                      <span className="badge">running…</span>
                    )}
                  </td>
                </tr>
                {expanded === j.id && (
                  <tr>
                    <td colSpan={6}>
                      <div className="job-detail">
                        <button onClick={() => window.api.openOutputDir(j.outputDir)}>Open output folder</button>
                        {!logs[j.id] && <p className="muted">Loading rows…</p>}
                        {logs[j.id] && (
                          <table className="nested">
                            <thead>
                              <tr>
                                <th>Row</th>
                                <th>Label</th>
                                <th>Status</th>
                                <th>Detail</th>
                              </tr>
                            </thead>
                            <tbody>
                              {logs[j.id].map((r) => (
                                <tr key={r.rowIndex}>
                                  <td>{r.rowIndex + 1}</td>
                                  <td>{r.rowLabel ?? '—'}</td>
                                  <td>
                                    <span className={r.status === 'failed' ? 'badge warn' : 'badge ok'}>
                                      {r.status}
                                    </span>
                                  </td>
                                  <td>{r.status === 'failed' ? r.error : r.outputFile}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
