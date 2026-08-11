import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '@shared/ipc'
import type {
  AppSettings,
  GenerateJobConfig,
  GenerateProgress,
  GenerateRowResult,
  GenerateSingleJobConfig,
  GenerateSingleResult,
  ImportedSheet,
  NewTemplateInput,
  StorageDirs,
  TemplateFieldDef,
  TemplatePreviewInput,
  TemplateRef,
  TemplateSettings,
  TemplateSource,
  UpdateTemplateInput
} from '@shared/types'

const api = {
  selectFile: (): Promise<string | null> => ipcRenderer.invoke(IPC.SELECT_FILE),
  selectHtmlFile: (): Promise<string | null> => ipcRenderer.invoke(IPC.SELECT_HTML_FILE),
  selectOutputDir: (): Promise<string | null> => ipcRenderer.invoke(IPC.SELECT_OUTPUT_DIR),
  openOutputDir: (dirPath: string): Promise<void> => ipcRenderer.invoke(IPC.OPEN_OUTPUT_DIR, dirPath),

  importSheet: (filePath: string): Promise<ImportedSheet> => ipcRenderer.invoke(IPC.IMPORT_SHEET, filePath),

  listTemplates: (): Promise<TemplateRef[]> => ipcRenderer.invoke(IPC.LIST_TEMPLATES),
  createTemplate: (input: NewTemplateInput): Promise<TemplateRef> => ipcRenderer.invoke(IPC.CREATE_TEMPLATE, input),
  updateTemplate: (templateRef: TemplateRef, input: UpdateTemplateInput): Promise<TemplateRef> =>
    ipcRenderer.invoke(IPC.UPDATE_TEMPLATE, templateRef, input),
  deleteTemplate: (templateRef: TemplateRef): Promise<void> => ipcRenderer.invoke(IPC.DELETE_TEMPLATE, templateRef),
  getTemplateSource: (templateRef: TemplateRef): Promise<TemplateSource> =>
    ipcRenderer.invoke(IPC.GET_TEMPLATE_SOURCE, templateRef),
  previewTemplate: (input: TemplatePreviewInput): Promise<string> => ipcRenderer.invoke(IPC.PREVIEW_TEMPLATE, input),
  detectTemplateFields: (html: string): Promise<TemplateFieldDef[]> =>
    ipcRenderer.invoke(IPC.DETECT_TEMPLATE_FIELDS, html),
  getTemplateSettings: (templateRef: TemplateRef): Promise<TemplateSettings> =>
    ipcRenderer.invoke(IPC.GET_TEMPLATE_SETTINGS, templateRef),
  saveTemplateSettings: (
    templateRef: TemplateRef,
    patch: Pick<TemplateSettings, 'mapping' | 'startRow' | 'paperSize'>
  ): Promise<TemplateSettings> => ipcRenderer.invoke(IPC.SAVE_TEMPLATE_SETTINGS, templateRef, patch),

  startGenerate: (job: GenerateJobConfig): Promise<boolean> => ipcRenderer.invoke(IPC.GENERATE_START, job),
  generateSingle: (job: GenerateSingleJobConfig): Promise<GenerateSingleResult> =>
    ipcRenderer.invoke(IPC.GENERATE_SINGLE, job),
  cancelGenerate: (): Promise<boolean> => ipcRenderer.invoke(IPC.GENERATE_CANCEL),
  onGenerateProgress: (cb: (p: GenerateProgress) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: GenerateProgress): void => cb(progress)
    ipcRenderer.on(IPC.GENERATE_PROGRESS, listener)
    return () => ipcRenderer.removeListener(IPC.GENERATE_PROGRESS, listener)
  },
  onGenerateRowResult: (cb: (r: GenerateRowResult) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, result: GenerateRowResult): void => cb(result)
    ipcRenderer.on(IPC.GENERATE_ROW_RESULT, listener)
    return () => ipcRenderer.removeListener(IPC.GENERATE_ROW_RESULT, listener)
  },

  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke(IPC.SETTINGS_GET),
  setSetting: (key: keyof AppSettings, value: string | undefined): Promise<AppSettings> =>
    ipcRenderer.invoke(IPC.SETTINGS_SET, key, value),

  getStorageDirs: (): Promise<StorageDirs> => ipcRenderer.invoke(IPC.STORAGE_GET_DIRS)
}

contextBridge.exposeInMainWorld('api', api)

export type AppApi = typeof api
