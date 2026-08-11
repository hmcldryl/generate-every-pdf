import { mkdir } from 'node:fs/promises'
import type { BrowserWindow } from 'electron'
import { IPC } from '@shared/ipc'
import type { GenerateJobConfig, GenerateSingleJobConfig, GenerateSingleResult } from '@shared/types'
import { getSheetRows } from './import'
import { startGenerateJob, cancelGenerateJob, GenerateCancelledError } from '../generate'
import { generateSingle } from '../generate/single'
import { imagesDirForTemplate } from '../paths'

/** Resolves to true if the batch finished, false if it was cancelled partway through. */
export async function runGenerateJob(win: BrowserWindow, job: GenerateJobConfig): Promise<boolean> {
  const rows = getSheetRows(job.sheetId)
  const imagesDir = imagesDirForTemplate(job.templateRef.id)
  await mkdir(imagesDir, { recursive: true })

  try {
    await startGenerateJob(
      job,
      rows,
      imagesDir,
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

/** Renders exactly one PDF from form-entered field values — see generate/single.ts. */
export async function runGenerateSingle(job: GenerateSingleJobConfig): Promise<GenerateSingleResult> {
  const imagesDir = imagesDirForTemplate(job.templateRef.id)
  await mkdir(imagesDir, { recursive: true })
  return generateSingle(job, imagesDir)
}

export { cancelGenerateJob }
