import { Worker } from 'node:worker_threads'
import { join } from 'node:path'
import type { GenerateJobConfig, GenerateProgress, GenerateRowResult } from '@shared/types'

// worker.ts is compiled to out/main/generate/worker.js (see electron.vite.config.ts).
const WORKER_PATH = join(__dirname, 'generate', 'worker.js')

export class GenerateCancelledError extends Error {
  constructor() {
    super('Generation cancelled')
    this.name = 'GenerateCancelledError'
  }
}

// Single active job at a time — the wizard only ever runs one batch per
// window — so a module-level handle is enough to cancel it from the IPC
// layer without threading a job id through everywhere.
let active: { worker: Worker; cancelled: boolean } | null = null

export function startGenerateJob(
  job: GenerateJobConfig,
  rows: Record<string, string>[],
  imagesDir: string,
  onProgress: (p: GenerateProgress) => void,
  onRowResult: (r: GenerateRowResult) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(WORKER_PATH, { workerData: { job, rows, imagesDir } })
    const handle = { worker, cancelled: false }
    active = handle

    worker.on('message', (msg: GenerateProgress | GenerateRowResult | { fatalError: string }) => {
      if ('fatalError' in msg) {
        reject(new Error(msg.fatalError))
        return
      }
      if ('rowIndex' in msg) {
        onRowResult(msg)
        return
      }
      onProgress(msg)
    })

    worker.on('error', reject)
    worker.on('exit', (code) => {
      if (active === handle) active = null
      if (handle.cancelled) {
        reject(new GenerateCancelledError())
      } else if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Generate worker exited with code ${code}`))
      }
    })
  })
}

/**
 * Stops the in-progress batch, if any. Asks the worker to stop after its
 * current row (postMessage, not terminate()) so it still gets to close its
 * Puppeteer browser — terminate() would kill the thread but leave that
 * Chromium child process orphaned. Returns true if a job was running.
 */
export function cancelGenerateJob(): boolean {
  if (!active) return false
  active.cancelled = true
  active.worker.postMessage({ type: 'cancel' })
  return true
}
