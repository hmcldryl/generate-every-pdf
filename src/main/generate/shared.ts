// Rendering helpers shared between worker.ts (batch generation, runs in a
// worker_thread) and single.ts (one-off generation, runs in the main
// process) — value sanitizing, image resolution/compression, and reading a
// template's template.json. Kept plain/side-effect-free so both callers can
// import it directly.

import { readFile } from 'node:fs/promises'
import { join, isAbsolute } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Page, PaperFormat } from 'puppeteer'
import type { FieldMapping, PaperSize } from '@shared/types'

export function sanitizeForFilename(value: string): string {
  return (value || 'unknown').replace(/[\\/:*?"<>|]/g, '_').trim()
}

// Common tell of mis-decoded text (UTF-8 bytes read back as Latin-1/CP1252):
// runs like the accented-letter/smart-quote mojibake pattern, where a
// two-byte UTF-8 sequence got split into two separate Latin-1 characters.
// Checked by character code rather than regex literals containing the
// characters themselves, so this file doesn't fall prey to the exact
// problem it's detecting.
function looksLikeMojibake(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if (code === 0xfffd) return true // Unicode replacement character
    if (code === 0x00c3 || code === 0x00c2) {
      const next = value.charCodeAt(i + 1)
      if (next >= 0x0080 && next <= 0x00bf) return true
    }
  }
  return false
}

// A cell that's nothing but scientific notation, e.g. "1.10774E+11" — a
// spreadsheet auto-converted a long ID/phone number and lost precision.
const SCIENTIFIC_NOTATION_RE = /^-?\d+(\.\d+)?[eE][+-]?\d+$/

/** Blanks values that look corrupted rather than let them into a generated document. */
export function sanitizeValue(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return value
  if (looksLikeMojibake(trimmed) || SCIENTIFIC_NOTATION_RE.test(trimmed)) return ''
  return value
}

// Relative href/src in template.html (style.css, assets/*) resolve against
// this base, as a belt-and-suspenders alongside navigating from inside the
// template's own folder.
export function injectBaseHref(html: string, templateDir: string): string {
  const baseTag = `<base href="${pathToFileURL(templateDir + '/').toString()}">`
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (match) => `${match}${baseTag}`)
  }
  return baseTag + html
}

export interface TemplateRenderSettings {
  mapping: FieldMapping
  startRow: number
  paperSize: PaperSize
  fileNamePattern?: string[]
}

// templateDir is already an absolute path resolved on the main thread.
// Mirrors ipc/template.ts's getTemplateSettings() defaults.
export async function readTemplateSettings(templateDir: string): Promise<TemplateRenderSettings> {
  try {
    const raw = await readFile(join(templateDir, 'template.json'), 'utf-8')
    const config = JSON.parse(raw) as {
      mapping?: FieldMapping
      startRow?: number
      paperSize?: PaperSize
      fileNamePattern?: string[]
    }
    return {
      mapping: config.mapping ?? {},
      startRow: config.startRow ?? 1,
      paperSize: config.paperSize ?? 'A4',
      fileNamePattern: config.fileNamePattern
    }
  } catch {
    return { mapping: {}, startRow: 1, paperSize: 'A4' }
  }
}

export function pdfSizeOptions(paperSize: PaperSize): { format: PaperFormat } | { width: string; height: string } {
  return typeof paperSize === 'string' ? { format: paperSize as PaperFormat } : paperSize
}

// Any mapped field whose value looks like an image filename/path is treated
// as an image field automatically — no need to flag it in template.json.
// Matched values get recompressed before embedding, since output size would
// otherwise ride on whatever resolution the source photo happened to be (a
// 12MP phone photo can bloat a single PDF to 25MB+ while another row with a
// small photo stays at 2MB).
export const IMAGE_PATH_RE = /\.(jpe?g|png|gif|webp|bmp)(\?.*)?$/i
const IMAGE_MAX_DIMENSION = 500
const IMAGE_JPEG_QUALITY = 0.72

// A bare filename (the normal case — "jane.jpg" typed straight into a
// sheet cell) resolves against this template's own
// Documents/GenerateEveryPDF/Images/<template-name>/ subfolder (imagesDir,
// passed in from ipc/generate.ts as imagesDirForTemplate()), so the user
// only ever has to drop files in one place per template and reference them
// by name. An absolute path, file:// URI, http(s) URL, or data: URI is used
// as-is, for testing or unusual setups.
export function resolveImageUrl(value: string, imagesDir: string): string {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value) || value.startsWith('file://') || value.startsWith('data:')) {
    return value
  }
  const path = isAbsolute(value) ? value : join(imagesDir, value)
  return pathToFileURL(path).toString()
}

/**
 * Re-renders an image to a small JPEG data URL via a scratch Puppeteer
 * page (canvas draw + toDataURL) — no extra image library needed, reuses
 * a Chromium page already running in the same browser instance as the
 * document render. Returns null (caller keeps the original value) if the
 * source can't be loaded/decoded at all.
 */
export async function compressImage(imagePage: Page, srcUrl: string): Promise<string | null> {
  try {
    await imagePage.goto(srcUrl, { waitUntil: 'load', timeout: 15000 })
    return await imagePage.evaluate(
      // This runs inside the page (a real browser context with `document`),
      // not under this file's Node/tsconfig — hence the `any` doc handle
      // rather than pulling in DOM lib types just for one callback.
      (maxDim: number, quality: number) => {
        const doc = (globalThis as unknown as { document: any }).document // eslint-disable-line @typescript-eslint/no-explicit-any
        const img = doc.querySelector('img')
        if (!img || !img.naturalWidth) return null
        const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight))
        const w = Math.max(1, Math.round(img.naturalWidth * scale))
        const h = Math.max(1, Math.round(img.naturalHeight * scale))
        const canvas = doc.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return null
        ctx.drawImage(img, 0, 0, w, h)
        return canvas.toDataURL('image/jpeg', quality) as string
      },
      IMAGE_MAX_DIMENSION,
      IMAGE_JPEG_QUALITY
    )
  } catch {
    return null
  }
}
