import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { app } from 'electron'
import type { TemplateFieldDef, TemplateRef } from '@shared/types'

// In dev, templates/ lives at repo root; in a packaged build it's copied
// alongside resources (see electron-builder.yml extraResources).
export function templatesRoot(): string {
  return app.isPackaged ? join(process.resourcesPath, 'templates') : join(app.getAppPath(), 'templates')
}

// Every folder directly under templates/ is one template: template.html +
// style.css + optional template.json (field schema) + assets/. No fixed
// document-type categories — add a folder, get a template.
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

function autoDetectFields(templateHtml: string): TemplateFieldDef[] {
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

interface TemplateJson {
  fields?: TemplateFieldDef[]
  fileNamePattern?: string[]
}

async function readTemplateJson(templateRef: TemplateRef): Promise<TemplateJson | null> {
  try {
    const raw = await readFile(join(templateRef.dir, 'template.json'), 'utf-8')
    return JSON.parse(raw) as TemplateJson
  } catch (err) {
    if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw new Error(
      `Invalid template.json for "${templateRef.id}": ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

/**
 * Field schema for a template: read from template.json in the template
 * folder if present (lets non-devs edit the field list per template
 * without touching app code), otherwise auto-detected from
 * {{placeholders}} in template.html.
 */
export async function getTemplateFields(templateRef: TemplateRef): Promise<TemplateFieldDef[]> {
  const config = await readTemplateJson(templateRef)
  if (config?.fields) return config.fields

  const html = await readFile(join(templateRef.dir, 'template.html'), 'utf-8')
  return autoDetectFields(html)
}

/** Field keys used to build each generated file's name, if declared. */
export async function getFileNamePattern(templateRef: TemplateRef): Promise<string[] | undefined> {
  const config = await readTemplateJson(templateRef)
  return config?.fileNamePattern
}
