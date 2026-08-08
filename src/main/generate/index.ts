import { Worker } from 'node:worker_threads'
import { join } from 'node:path'
import type { GenerateJobConfig, GenerateProgress, GenerateRowResult } from '@shared/types'
import { getDb } from '../db'
import { randomUUID } from 'node:crypto'

// worker.ts is compiled to out/main/generate/worker.js (see electron.vite.config.ts).
const WORKER_PATH = join(__dirname, 'generate', 'worker.js')

export function startGenerateJob(
  job: GenerateJobConfig,
  rows: Record<string, string>[],
  onProgress: (p: GenerateProgress) => void,
  onRowResult: (r: GenerateRowResult) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(WORKER_PATH, { workerData: { job, rows } })
    const jobId = randomUUID()
    const db = getDb()

    db.prepare(
      `INSERT INTO generation_jobs (id, template_id, sheet_id, output_dir, started_at, total)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(jobId, job.templateRef.id, job.sheetId, job.outputDir, new Date().toISOString(), rows.length)

    worker.on('message', (msg: GenerateProgress | GenerateRowResult | { fatalError: string }) => {
      if ('fatalError' in msg) {
        reject(new Error(msg.fatalError))
        return
      }
      if ('rowIndex' in msg) {
        onRowResult(msg)
        db.prepare(
          `INSERT INTO generation_log (job_id, row_index, row_label, output_file, status, error)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).run(jobId, msg.rowIndex, msg.rowLabel ?? null, msg.outputFile ?? null, msg.status, msg.error ?? null)
        return
      }
      onProgress(msg)
      if (msg.done) {
        db.prepare(
          `UPDATE generation_jobs SET finished_at = ?, succeeded = ?, failed = ? WHERE id = ?`
        ).run(new Date().toISOString(), msg.succeeded, msg.failed, jobId)
      }
    })

    worker.on('error', reject)
    worker.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`Generate worker exited with code ${code}`))
    })
  })
}
