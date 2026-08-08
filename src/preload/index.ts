import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '@shared/ipc'
import type {
  AppSettings,
  DashboardStats,
  FieldMapping,
  GenerateJobConfig,
  GenerateProgress,
  GenerateRowResult,
  GenerationJobSummary,
  ImportedSheet,
  JobLogEntry,
  MappingPreset,
  TemplateFieldDef,
  TemplateRef
} from '@shared/types'

const api = {
  selectFile: (): Promise<string | null> => ipcRenderer.invoke(IPC.SELECT_FILE),
  selectOutputDir: (): Promise<string | null> => ipcRenderer.invoke(IPC.SELECT_OUTPUT_DIR),
  openOutputDir: (dirPath: string): Promise<void> => ipcRenderer.invoke(IPC.OPEN_OUTPUT_DIR, dirPath),

  importSheet: (filePath: string): Promise<ImportedSheet> => ipcRenderer.invoke(IPC.IMPORT_SHEET, filePath),

  listTemplates: (): Promise<TemplateRef[]> => ipcRenderer.invoke(IPC.LIST_TEMPLATES),
  getTemplateFields: (templateRef: TemplateRef): Promise<TemplateFieldDef[]> =>
    ipcRenderer.invoke(IPC.GET_TEMPLATE_FIELDS, templateRef),

  listMappingPresets: (templateId: string): Promise<MappingPreset[]> =>
    ipcRenderer.invoke(IPC.LIST_MAPPING_PRESETS, templateId),
  listAllMappingPresets: (): Promise<MappingPreset[]> => ipcRenderer.invoke(IPC.LIST_ALL_MAPPING_PRESETS),
  saveMappingPreset: (name: string, templateId: string, mapping: FieldMapping): Promise<MappingPreset> =>
    ipcRenderer.invoke(IPC.SAVE_MAPPING_PRESET, name, templateId, mapping),
  deleteMappingPreset: (id: string): Promise<void> => ipcRenderer.invoke(IPC.DELETE_MAPPING_PRESET, id),

  startGenerate: (job: GenerateJobConfig): Promise<void> => ipcRenderer.invoke(IPC.GENERATE_START, job),
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

  listGenerationJobs: (limit?: number): Promise<GenerationJobSummary[]> =>
    ipcRenderer.invoke(IPC.HISTORY_LIST, limit),
  getJobLogs: (jobId: string): Promise<JobLogEntry[]> => ipcRenderer.invoke(IPC.HISTORY_JOB_LOGS, jobId),

  getDashboardStats: (): Promise<DashboardStats> => ipcRenderer.invoke(IPC.STATS_SUMMARY)
}

contextBridge.exposeInMainWorld('api', api)

export type AppApi = typeof api
