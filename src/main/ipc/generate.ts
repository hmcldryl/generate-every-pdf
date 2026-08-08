import type { BrowserWindow } from 'electron'
import { IPC } from '@shared/ipc'
import type { GenerateJobConfig } from '@shared/types'
import { getSheetRows } from './import'
import { startGenerateJob } from '../generate'

export async function runGenerateJob(win: BrowserWindow, job: GenerateJobConfig): Promise<void> {
  const rows = getSheetRows(job.sheetId)

  await startGenerateJob(
    job,
    rows,
    (progress) => win.webContents.send(IPC.GENERATE_PROGRESS, progress),
    (result) => win.webContents.send(IPC.GENERATE_ROW_RESULT, result)
  )
}
