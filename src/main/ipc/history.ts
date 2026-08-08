import { getDb } from '../db'
import type { GenerationJobSummary, JobLogEntry } from '@shared/types'

interface JobRow {
  id: string
  template_id: string
  sheet_id: string
  output_dir: string
  started_at: string
  finished_at: string | null
  total: number
  succeeded: number
  failed: number
}

function toSummary(r: JobRow): GenerationJobSummary {
  return {
    id: r.id,
    templateId: r.template_id,
    sheetId: r.sheet_id,
    outputDir: r.output_dir,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
    total: r.total,
    succeeded: r.succeeded,
    failed: r.failed
  }
}

export function listGenerationJobs(limit = 100): GenerationJobSummary[] {
  const db = getDb()
  const rows = db.prepare(`SELECT * FROM generation_jobs ORDER BY started_at DESC LIMIT ?`).all(limit) as JobRow[]
  return rows.map(toSummary)
}

export function getJobLogs(jobId: string): JobLogEntry[] {
  const db = getDb()
  const rows = db
    .prepare(
      `SELECT row_index, row_label, output_file, status, error FROM generation_log WHERE job_id = ? ORDER BY row_index ASC`
    )
    .all(jobId) as Array<{
    row_index: number
    row_label: string | null
    output_file: string | null
    status: 'success' | 'failed'
    error: string | null
  }>
  return rows.map((r) => ({
    rowIndex: r.row_index,
    rowLabel: r.row_label,
    outputFile: r.output_file,
    status: r.status,
    error: r.error
  }))
}
