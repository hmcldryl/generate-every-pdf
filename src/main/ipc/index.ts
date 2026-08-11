import { readFile } from 'node:fs/promises'
import { ipcMain, dialog, shell, BrowserWindow } from 'electron'
import { IPC } from '@shared/ipc'
import type {
  AppSettings,
  GenerateJobConfig,
  GenerateSingleJobConfig,
  NewTemplateInput,
  TemplatePreviewInput,
  TemplateRef,
  TemplateSettings,
  UpdateTemplateInput
} from '@shared/types'
import { importSheetFile } from './import'
import {
  listTemplates,
  getTemplateSettings,
  saveTemplateSettings,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getTemplateSource,
  detectTemplateFields
} from './template'
import { runGenerateJob, runGenerateSingle, cancelGenerateJob } from './generate'
import { renderTemplatePreview } from '../generate/preview'
import { getSettings, setSetting } from './settings'
import { getStorageDirs } from '../paths'

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC.SELECT_FILE, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Spreadsheets', extensions: ['xlsx', 'xls', 'csv'] }]
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle(IPC.SELECT_HTML_FILE, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'HTML', extensions: ['html', 'htm'] }]
    })
    if (result.canceled) return null
    return readFile(result.filePaths[0], 'utf-8')
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

  ipcMain.handle(IPC.CREATE_TEMPLATE, async (_event, input: NewTemplateInput) => {
    return createTemplate(input)
  })

  ipcMain.handle(IPC.UPDATE_TEMPLATE, async (_event, templateRef: TemplateRef, input: UpdateTemplateInput) => {
    return updateTemplate(templateRef, input)
  })

  ipcMain.handle(IPC.DELETE_TEMPLATE, async (_event, templateRef: TemplateRef) => {
    return deleteTemplate(templateRef)
  })

  ipcMain.handle(IPC.GET_TEMPLATE_SOURCE, async (_event, templateRef: TemplateRef) => {
    return getTemplateSource(templateRef)
  })

  ipcMain.handle(IPC.PREVIEW_TEMPLATE, async (_event, input: TemplatePreviewInput) => {
    return renderTemplatePreview(input)
  })

  ipcMain.handle(IPC.DETECT_TEMPLATE_FIELDS, async (_event, html: string) => {
    return detectTemplateFields(html)
  })

  ipcMain.handle(IPC.GET_TEMPLATE_SETTINGS, async (_event, templateRef: TemplateRef) => {
    return getTemplateSettings(templateRef)
  })

  ipcMain.handle(
    IPC.SAVE_TEMPLATE_SETTINGS,
    async (_event, templateRef: TemplateRef, patch: Pick<TemplateSettings, 'mapping' | 'startRow' | 'paperSize'>) => {
      return saveTemplateSettings(templateRef, patch)
    }
  )

  ipcMain.handle(IPC.GENERATE_START, async (event, job: GenerateJobConfig) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) throw new Error('No window for generate job')
    return runGenerateJob(win, job)
  })

  ipcMain.handle(IPC.GENERATE_SINGLE, async (_event, job: GenerateSingleJobConfig) => {
    return runGenerateSingle(job)
  })

  ipcMain.handle(IPC.GENERATE_CANCEL, async () => {
    return cancelGenerateJob()
  })

  ipcMain.handle(IPC.SETTINGS_GET, async () => {
    return getSettings()
  })

  ipcMain.handle(IPC.SETTINGS_SET, async (_event, key: keyof AppSettings, value: string | undefined) => {
    return setSetting(key, value)
  })

  ipcMain.handle(IPC.STORAGE_GET_DIRS, async () => {
    return getStorageDirs()
  })
}
