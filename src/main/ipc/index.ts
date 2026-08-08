import { ipcMain, dialog, shell, BrowserWindow } from 'electron'
import { IPC } from '@shared/ipc'
import type { AppSettings, FieldMapping, GenerateJobConfig, TemplateRef } from '@shared/types'
import { importSheetFile } from './import'
import { listTemplates, getTemplateFields } from './template'
import { listMappingPresets, listAllMappingPresets, saveMappingPreset, deleteMappingPreset } from './mapping'
import { runGenerateJob } from './generate'
import { getSettings, setSetting } from './settings'
import { listGenerationJobs, getJobLogs } from './history'
import { getDashboardStats } from './stats'

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC.SELECT_FILE, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Spreadsheets', extensions: ['xlsx', 'xls', 'csv'] }]
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle(IPC.SELECT_OUTPUT_DIR, async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle(IPC.OPEN_OUTPUT_DIR, async (_event, dirPath: string) => {
    await shell.openPath(dirPath)
  })

  ipcMain.handle(IPC.IMPORT_SHEET, async (_event, filePath: string) => {
    return importSheetFile(filePath)
  })

  ipcMain.handle(IPC.LIST_TEMPLATES, async () => {
    return listTemplates()
  })

  ipcMain.handle(IPC.GET_TEMPLATE_FIELDS, async (_event, templateRef: TemplateRef) => {
    return getTemplateFields(templateRef)
  })

  ipcMain.handle(IPC.LIST_MAPPING_PRESETS, async (_event, templateId: string) => {
    return listMappingPresets(templateId)
  })

  ipcMain.handle(IPC.LIST_ALL_MAPPING_PRESETS, async () => {
    return listAllMappingPresets()
  })

  ipcMain.handle(IPC.SAVE_MAPPING_PRESET, async (_event, name: string, templateId: string, mapping: FieldMapping) => {
    return saveMappingPreset(name, templateId, mapping)
  })

  ipcMain.handle(IPC.DELETE_MAPPING_PRESET, async (_event, id: string) => {
    deleteMappingPreset(id)
  })

  ipcMain.handle(IPC.GENERATE_START, async (event, job: GenerateJobConfig) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) throw new Error('No window for generate job')
    await runGenerateJob(win, job)
  })

  ipcMain.handle(IPC.SETTINGS_GET, async () => {
    return getSettings()
  })

  ipcMain.handle(IPC.SETTINGS_SET, async (_event, key: keyof AppSettings, value: string | undefined) => {
    return setSetting(key, value)
  })

  ipcMain.handle(IPC.HISTORY_LIST, async (_event, limit?: number) => {
    return listGenerationJobs(limit)
  })

  ipcMain.handle(IPC.HISTORY_JOB_LOGS, async (_event, jobId: string) => {
    return getJobLogs(jobId)
  })

  ipcMain.handle(IPC.STATS_SUMMARY, async () => {
    return getDashboardStats()
  })
}
