// Shared types between main and renderer processes.

export interface TemplateRef {
  id: string // template folder name under templates/
  dir: string // absolute path to templates/{id}
}

export interface ImportedSheet {
  id: string
  fileName: string
  importedAt: string
  columns: string[]
  rowCount: number
}

export interface FieldMapping {
  // template field name -> sheet column name
  [templateField: string]: string
}

// A template's expected data fields, declared as JSON alongside the
// template (template.json in the same folder) so field lists are entirely
// data-driven per template — no per-document-type code. If a template has
// no template.json, the app falls back to auto-detecting {{placeholders}}
// from template.html.
export interface TemplateFieldDef {
  key: string
  label: string
  required?: boolean
}

export interface MappingPreset {
  id: string
  name: string
  templateId: string
  mapping: FieldMapping
  createdAt: string
}

export interface GenerateJobConfig {
  sheetId: string
  templateRef: TemplateRef
  mapping: FieldMapping
  outputDir: string
}

export interface GenerateProgress {
  jobId: string
  total: number
  completed: number
  succeeded: number
  failed: number
  currentRow?: string
  done: boolean
}

export interface GenerateRowResult {
  jobId: string
  rowIndex: number
  rowLabel?: string // identifying value for the row, e.g. from fileNamePattern
  outputFile?: string
  status: 'success' | 'failed'
  error?: string
}

export interface AppSettings {
  defaultOutputDir?: string
}

export interface GenerationJobSummary {
  id: string
  templateId: string
  sheetId: string
  outputDir: string
  startedAt: string
  finishedAt: string | null
  total: number
  succeeded: number
  failed: number
}

export interface JobLogEntry {
  rowIndex: number
  rowLabel: string | null
  outputFile: string | null
  status: 'success' | 'failed'
  error: string | null
}

export interface DashboardStats {
  totalJobs: number
  totalGenerated: number
  totalSucceeded: number
  totalFailed: number
  recentJobs: GenerationJobSummary[]
}
