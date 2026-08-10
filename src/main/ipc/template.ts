import { access, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type {
  FieldMapping,
  NewTemplateInput,
  PaperSize,
  TemplateFieldDef,
  TemplateRef,
  TemplateSettings,
  TemplateSource,
  UpdateTemplateInput
} from '@shared/types'
import { templatesRoot } from '../paths'

// Every folder directly under Documents/GenerateEveryPDF/Templates/ is one
// template: template.html + style.css + template.json (the one settings
// file: fields, mapping, startRow, paperSize, fileNamePattern) + assets/.
// No fixed document-type categories — add a folder, get a template.
export async function listTemplates(): Promise<TemplateRef[]> {
  const dir = templatesRoot()
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => ({ id: e.name, dir: join(dir, e.name) }))
      .sort((a, b) => a.id.localeCompare(b.id))
  } catch {
    return []
  }
}

// Handlebars built-ins/block keywords that show up as {{...}} but aren't
// data fields, so auto-detection doesn't offer them as mappable columns.
const HANDLEBARS_KEYWORDS = new Set(['if', 'else', 'unless', 'each', 'with', 'this', 'log'])

export function detectTemplateFields(templateHtml: string): TemplateFieldDef[] {
  const keys = new Set<string>()
  const matches = templateHtml.matchAll(/\{\{\s*([#/>&]?)\s*([a-zA-Z0-9_.]+)/g)
  for (const [, sigil, rawKey] of matches) {
    if (sigil === '/' || sigil === '>') continue // closing tag or partial, not a field
    const key = rawKey.split('.')[0]
    if (HANDLEBARS_KEYWORDS.has(key)) continue
    keys.add(key)
  }
  return Array.from(keys).map((key) => ({ key, label: key }))
}

// Raw shape of template.json on disk — every key optional, since a
// template can rely entirely on {{placeholder}} auto-detection.
interface TemplateJson {
  fields?: TemplateFieldDef[]
  mapping?: FieldMapping
  startRow?: number
  paperSize?: PaperSize
  fileNamePattern?: string[]
}

const DEFAULT_START_ROW = 1
const DEFAULT_PAPER_SIZE: PaperSize = 'A4'

function templateJsonPath(templateRef: TemplateRef): string {
  return join(templateRef.dir, 'template.json')
}

/** A template's raw editable source (HTML + CSS), for loading into the edit form. */
export async function getTemplateSource(templateRef: TemplateRef): Promise<TemplateSource> {
  const html = await readFile(join(templateRef.dir, 'template.html'), 'utf-8')
  const css = await readFile(join(templateRef.dir, 'style.css'), 'utf-8').catch(() => '')
  return { html, css }
}

async function readTemplateJson(templateRef: TemplateRef): Promise<TemplateJson | null> {
  try {
    const raw = await readFile(templateJsonPath(templateRef), 'utf-8')
    return JSON.parse(raw) as TemplateJson
  } catch (err) {
    if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw new Error(
      `Invalid template.json for "${templateRef.id}": ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

/**
 * The one settings file for a template: field schema, column mapping,
 * which sheet row data starts on, and paper size, read from template.json
 * in the template folder. Fields fall back to auto-detecting
 * {{placeholders}} from template.html if template.json has none declared.
 */
export async function getTemplateSettings(templateRef: TemplateRef): Promise<TemplateSettings> {
  const config = await readTemplateJson(templateRef)

  let fields = config?.fields
  if (!fields) {
    const html = await readFile(join(templateRef.dir, 'template.html'), 'utf-8')
    fields = detectTemplateFields(html)
  }

  return {
    fields,
    mapping: config?.mapping ?? {},
    startRow: config?.startRow ?? DEFAULT_START_ROW,
    paperSize: config?.paperSize ?? DEFAULT_PAPER_SIZE,
    fileNamePattern: config?.fileNamePattern
  }
}

/**
 * Persists mapping / startRow / paperSize back into the template's
 * template.json, merged with whatever fields/fileNamePattern already live
 * there. This is the only write path for a template's settings.
 */
export async function saveTemplateSettings(
  templateRef: TemplateRef,
  patch: Pick<TemplateSettings, 'mapping' | 'startRow' | 'paperSize'>
): Promise<TemplateSettings> {
  const existing = (await readTemplateJson(templateRef)) ?? {}
  const merged: TemplateJson = {
    ...existing,
    mapping: patch.mapping,
    startRow: patch.startRow,
    paperSize: patch.paperSize
  }
  await writeFile(templateJsonPath(templateRef), JSON.stringify(merged, null, 2) + '\n', 'utf-8')
  return getTemplateSettings(templateRef)
}

/** Deletes a template's entire folder. Irreversible — the renderer confirms first. */
export async function deleteTemplate(templateRef: TemplateRef): Promise<void> {
  await rm(templateRef.dir, { recursive: true, force: true })
}

function slugify(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'template'
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

/**
 * Creates a new template folder from the app itself: template.html, an
 * empty style.css, an assets/ folder, and template.json with the field
 * schema, start row, and paper size the user picked. Mapping starts empty —
 * that's set per batch from the wizard's Template step.
 */
export async function createTemplate(input: NewTemplateInput): Promise<TemplateRef> {
  const name = input.name.trim()
  if (!name) throw new Error('Template name is required')
  if (!input.html.trim()) throw new Error('Template HTML is required')

  const id = slugify(name)
  const dir = join(templatesRoot(), id)

  if (await exists(dir)) {
    throw new Error(`A template named "${id}" already exists`)
  }

  await mkdir(join(dir, 'assets'), { recursive: true })
  await writeFile(join(dir, 'template.html'), input.html, 'utf-8')
  await writeFile(join(dir, 'style.css'), input.css ?? '', 'utf-8')

  const config: TemplateJson = {
    fields: input.fields,
    mapping: {},
    startRow: input.startRow,
    paperSize: input.paperSize,
    fileNamePattern: input.fileNamePattern
  }
  await writeFile(join(dir, 'template.json'), JSON.stringify(config, null, 2) + '\n', 'utf-8')

  return { id, dir }
}

/**
 * Overwrites an existing template's HTML, CSS, field schema, start row,
 * and paper size. The folder name doesn't change; mapping and
 * fileNamePattern (set from the app's Template step) are left as they are.
 */
export async function updateTemplate(templateRef: TemplateRef, input: UpdateTemplateInput): Promise<TemplateRef> {
  if (!input.html.trim()) throw new Error('Template HTML is required')

  await writeFile(join(templateRef.dir, 'template.html'), input.html, 'utf-8')
  await writeFile(join(templateRef.dir, 'style.css'), input.css, 'utf-8')

  const existing = (await readTemplateJson(templateRef)) ?? {}
  const merged: TemplateJson = {
    ...existing,
    fields: input.fields,
    startRow: input.startRow,
    paperSize: input.paperSize
  }
  await writeFile(templateJsonPath(templateRef), JSON.stringify(merged, null, 2) + '\n', 'utf-8')

  return templateRef
}
