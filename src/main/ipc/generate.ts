import type { BrowserWindow } from 'electron'
import { IPC } from '@shared/ipc'
import type { GenerateJobConfig } from '@shared/types'
import { getSheetRows } from './import'
import { startGenerateJob, cancelGenerateJob, GenerateCancelledError } from '../generate'
import { imagesRoot } from '../paths'

/** Resolves to true if the batch finished, false if it was cancelled partway through. */
export async function runGenerateJob(win: BrowserWindow, job: GenerateJobConfig): Promise<boolean> {
  const rows = getSheetRows(job.sheetId)

  try {
    await startGenerateJob(
      job,
      rows,
      imagesRoot(),
      (progress) => win.webContents.send(IPC.GENERATE_PROGRESS, progress),
      (result) => win.webContents.send(IPC.GENERATE_ROW_RESULT, result)
    )
    return true
  } catch (err) {
    // Cancelling is a deliberate user action, not a failure — resolve false
    // instead of rejecting so the renderer doesn't show it as an error.
    if (err instanceof GenerateCancelledError) return false
    throw err
  }
}

export { cancelGenerateJob }
