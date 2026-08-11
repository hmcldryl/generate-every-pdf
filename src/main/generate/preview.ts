// Renders a one-off PNG preview of a template's HTML/CSS with sample data,
// for the template form to show before saving. Runs in the main process
// (unlike worker.ts's generation, this is a single on-demand render, not a
// batch, so no need for a worker thread).

import { writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import puppeteer from 'puppeteer'
import Handlebars from 'handlebars'
import type { PaperSize, TemplateFieldDef, TemplatePreviewInput } from '@shared/types'
import { registerTemplateHelpers } from './handlebarsHelpers'

registerTemplateHelpers(Handlebars)

// A plain gray box, standing in for a real photo — real image fields resolve
// a filename from Documents/GenerateEveryPDF/Images at generation time, but
// there's no real row (or Images folder lookup) to preview with here.
const PLACEHOLDER_IMAGE =
  'data:image/svg+xml;base64,' +
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#ddd"/></svg>'
  ).toString('base64')

// No real spreadsheet row to preview with, so fill every field with its own
// label (a placeholder image for "image"-type fields) — shows where each
// field lands without needing sample data typed in.
function sampleData(fields: TemplateFieldDef[]): Record<string, string> {
  const data: Record<string, string> = {}
  for (const field of fields) {
    if (!field.key.trim()) continue
    data[field.key] = field.type === 'image' ? PLACEHOLDER_IMAGE : field.label || field.key
  }
  return data
}

// CSS px at 96dpi, portrait, for a representative preview width.
const PAPER_WIDTH_PX: Record<Exclude<PaperSize, { width: string; height: string }>, number> = {
  A0: 3179,
  A1: 2245,
  A2: 1587,
  A3: 1123,
  A4: 794,
  A5: 559,
  A6: 397,
  Letter: 816,
  Legal: 816,
  Tabloid: 1056,
  Ledger: 1632
}

const UNIT_TO_PX: Record<string, number> = { in: 96, cm: 37.8, mm: 3.78, px: 1 }

function customSizeToPx(value: string): number | null {
  const match = /^([\d.]+)\s*(in|cm|mm|px)$/i.exec(value.trim())
  if (!match) return null
  return Math.round(Number(match[1]) * UNIT_TO_PX[match[2].toLowerCase()])
}

function previewWidth(paperSize: PaperSize): number {
  if (typeof paperSize === 'string') return PAPER_WIDTH_PX[paperSize] ?? 816
  return customSizeToPx(paperSize.width) ?? 816
}

export async function renderTemplatePreview(input: TemplatePreviewInput): Promise<string> {
  const template = Handlebars.compile(input.html)
  let rendered = template(sampleData(input.fields))

  // Inline the in-progress CSS text directly rather than relying on the
  // linked style.css — that link may point at a stale on-disk file while
  // the user is still editing.
  const styleTag = `<style>${input.css}</style>`
  rendered = /<\/head>/i.test(rendered) ? rendered.replace(/<\/head>/i, `${styleTag}</head>`) : styleTag + rendered

  // Only an existing (already-saved) template has a real folder for
  // relative assets/* paths to resolve against.
  if (input.templateRef) {
    const baseTag = `<base href="${pathToFileURL(input.templateRef.dir + '/').toString()}">`
    rendered = /<head[^>]*>/i.test(rendered)
      ? rendered.replace(/<head[^>]*>/i, (m) => `${m}${baseTag}`)
      : baseTag + rendered
  }

  const tempHtmlPath = join(tmpdir(), `generateeverypdf-preview-${randomUUID()}.html`)
  await writeFile(tempHtmlPath, rendered, 'utf-8')

  let browser
  try {
    browser = await puppeteer.launch({ headless: true })
    const page = await browser.newPage()
    await page.setViewport({ width: previewWidth(input.paperSize), height: 1100 })
    // Same reason as worker.ts: page.setContent() can't load local
    // file:// subresources, so navigate to a real file:// document instead.
    await page.goto(pathToFileURL(tempHtmlPath).toString(), { waitUntil: 'networkidle0' })
    const buffer = await page.screenshot({ type: 'png', fullPage: true })
    return `data:image/png;base64,${Buffer.from(buffer).toString('base64')}`
  } finally {
    await browser?.close()
    await rm(tempHtmlPath, { force: true })
  }
}
