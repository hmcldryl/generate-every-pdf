// Shared types between main and renderer processes.

export interface TemplateRef {
  id: string // template folder name under Documents/GenerateEveryPDF/Templates/
  dir: string // absolute path to that folder
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
//
// `type` only affects how the app documents/labels the field — the mapped
// sheet value is always a string, and the template's own Handlebars markup
// decides what to do with it:
//   - "text" (default): printed as-is.
//   - "checkbox": compared against a value in template.html, typically
//     with the `eq`/`notEmpty` helpers, e.g. {{#if (eq attending "Yes")}}.
//   - "image": the mapped cell holds a filename (e.g. "jane.jpg") that the
//     generator looks up in Documents/GenerateEveryPDF/Images and embeds —
//     see resolveImageUrl() in generate/worker.ts.
export interface TemplateFieldDef {
  key: string
  label: string
  required?: boolean
  type?: 'text' | 'checkbox' | 'image'
}

// Matches Puppeteer's PDFOptions.format values, or a custom size.
export type PaperSize =
  | 'Letter'
  | 'Legal'
  | 'Tabloid'
  | 'Ledger'
  | 'A0'
  | 'A1'
  | 'A2'
  | 'A3'
  | 'A4'
  | 'A5'
  | 'A6'
  | { width: string; height: string }

// Everything one template needs, in one place: template.json alongside
// template.html. Combines the field schema, the column mapping, which
// sheet row data starts on, and paper size — no separate mapping-preset
// store, no separate settings file.
export interface TemplateSettings {
  fields: TemplateFieldDef[]
  mapping: FieldMapping
  startRow: number // 1-based index into the sheet's data rows (header excluded)
  paperSize: PaperSize
  fileNamePattern?: string[]
}

// Input for creating a new template from the app itself, instead of
// hand-adding a folder under templates/.
export interface NewTemplateInput {
  name: string
  html: string
  css?: string
  fields: TemplateFieldDef[]
  startRow: number
  paperSize: PaperSize
  fileNamePattern?: string[]
}

// Input for editing an existing template's content from the app. The
// folder name (TemplateRef.id) doesn't change; mapping and fileNamePattern
// are left as they were.
export interface UpdateTemplateInput {
  html: string
  css: string
  fields: TemplateFieldDef[]
  startRow: number
  paperSize: PaperSize
}

// A template's raw editable source, for loading into the edit form.
export interface TemplateSource {
  html: string
  css: string
}

// Renders a one-off preview image of in-progress (possibly unsaved) HTML/CSS
// with sample data filled in, so it can be checked before saving. templateRef
// is only passed when previewing an existing template, so assets/* resolve.
export interface TemplatePreviewInput {
  templateRef?: TemplateRef
  html: string
  css: string
  fields: TemplateFieldDef[]
  paperSize: PaperSize
}

export interface GenerateJobConfig {
  sheetId: string
  templateRef: TemplateRef
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

// Where templates and row images live on disk (Documents/GenerateEveryPDF/*)
// — surfaced in Settings so the user can find/back up that folder.
export interface StorageDirs {
  templatesDir: string
  imagesDir: string
}
