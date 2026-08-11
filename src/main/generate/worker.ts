// Runs in a worker_thread. Owns a single Puppeteer browser instance and
// renders one PDF per row, reporting progress back to the main thread via
// parentPort messages so the UI thread never blocks.

import { parentPort, workerData } from 'node:worker_threads'
import { readFile, mkdir, rm, writeFile } from 'node:fs/promises'
import { join, isAbsolute } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { randomUUID } from 'node:crypto'
import puppeteer, { type Browser, type Page, type PaperFormat } from 'puppeteer'
import Handlebars from 'handlebars'
import type { FieldMapping, GenerateJobConfig, GenerateProgress, GenerateRowResult, PaperSize } from '@shared/types'
import { registerTemplateHelpers } from './handlebarsHelpers'

interface WorkerInput {
  job: GenerateJobConfig
  rows: Record<string, string>[]
  imagesDir: string
}

function post(message: GenerateProgress | GenerateRowResult): void {
  parentPort?.postMessage(message)
}

let cancelRequested = false
parentPort?.on('message', (msg: { type?: string }) => {
  if (msg?.type === 'cancel') cancelRequested = true
})

function sanitizeForFilename(value: string): string {
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
function sanitizeValue(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return value
  if (looksLikeMojibake(trimmed) || SCIENTIFIC_NOTATION_RE.test(trimmed)) return ''
  return value
}

registerTemplateHelpers(Handlebars)

// Relative href/src in template.html (style.css, assets/*) resolve against
// this base, as a belt-and-suspenders alongside navigating from inside the
// template's own folder (see run()).
function injectBaseHref(html: string, templateDir: string): string {
  const baseTag = `<base href="${pathToFileURL(templateDir + '/').toString()}">`
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (match) => `${match}${baseTag}`)
  }
  return baseTag + html
}

interface WorkerTemplateSettings {
  mapping: FieldMapping
  startRow: number
  paperSize: PaperSize
  fileNamePattern?: string[]
}

// Worker threads can't reach into electron's `app` singleton, so this reads
// template.json directly with plain fs — templateRef.dir is already an
// absolute path resolved on the main thread. Mirrors ipc/template.ts's
// getTemplateSettings() defaults.
async function readTemplateSettings(templateDir: string): Promise<WorkerTemplateSettings> {
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

function pdfSizeOptions(paperSize: PaperSize): { format: PaperFormat } | { width: string; height: string } {
  return typeof paperSize === 'string' ? { format: paperSize as PaperFormat } : paperSize
}

// Any mapped field whose value looks like an image filename/path is treated
// as an image field automatically — no need to flag it in template.json.
// Matched values get recompressed before embedding, since output size would
// otherwise ride on whatever resolution the source photo happened to be (a
// 12MP phone photo can bloat a single PDF to 25MB+ while another row with a
// small photo stays at 2MB).
const IMAGE_PATH_RE = /\.(jpe?g|png|gif|webp|bmp)(\?.*)?$/i
const IMAGE_MAX_DIMENSION = 500
const IMAGE_JPEG_QUALITY = 0.72

// A bare filename (the normal case — "jane.jpg" typed straight into a
// sheet cell) resolves against Documents/GenerateEveryPDF/Images, so the
// user only ever has to drop files in one place and reference them by
// name. An absolute path, file:// URI, http(s) URL, or data: URI is used
// as-is, for testing or unusual setups.
function resolveImageUrl(value: string, imagesDir: string): string {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value) || value.startsWith('file://') || value.startsWith('data:')) {
    return value
  }
  const path = isAbsolute(value) ? value : join(imagesDir, value)
  return pathToFileURL(path).toString()
}

/**
 * Re-renders an image to a small JPEG data URL via a scratch Puppeteer
 * page (canvas draw + toDataURL) — no extra image library needed, reuses
 * the same Chromium already running the batch. Returns null (caller keeps
 * the original value) if the source can't be loaded/decoded at all.
 */
async function compressImage(imagePage: Page, srcUrl: string): Promise<string | null> {
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

async function run(): Promise<void> {
  const { job, rows: allRows, imagesDir } = workerData as WorkerInput
  const jobId = job.sheetId + ':' + Date.now()

  await mkdir(job.outputDir, { recursive: true })

  const templateHtml = await readFile(join(job.templateRef.dir, 'template.html'), 'utf-8')
  const template = Handlebars.compile(templateHtml)
  const settings = await readTemplateSettings(job.templateRef.dir)
  const { fileNamePattern } = settings
  const pdfSize = pdfSizeOptions(settings.paperSize)

  // startRow is 1-based over the sheet's data rows (header excluded).
  const rows = allRows.slice(Math.max(0, settings.startRow - 1))

  const progress: GenerateProgress = {
    jobId,
    total: rows.length,
    completed: 0,
    succeeded: 0,
    failed: 0,
    done: false
  }
  post(progress)

  // Chromium refuses to load local file:// subresources (style.css,
  // assets/*) into a page.setContent() document — that content has no
  // origin of its own ("Not allowed to load local resource"). Navigating
  // to a real file:// document via page.goto() gives it one, so relative
  // links resolve normally. One temp file, overwritten and reused per row.
  const tempHtmlPath = join(tmpdir(), `generateeverypdf-${randomUUID()}.html`)

  let browser: Browser | null = null
  try {
    browser = await puppeteer.launch({ headless: true })
    const page = await browser.newPage()
    const imagePage = await browser.newPage()
    const imageCache = new Map<string, string | null>()

    for (let i = 0; i < rows.length; i++) {
      if (cancelRequested) break

      const row = rows[i]
      const data: Record<string, string> = {}
      for (const [templateField, sheetColumn] of Object.entries(settings.mapping)) {
        data[templateField] = sanitizeValue(row[sheetColumn] ?? '')
      }

      for (const [field, value] of Object.entries(data)) {
        if (!value || !IMAGE_PATH_RE.test(value.trim())) continue
        const srcUrl = resolveImageUrl(value.trim(), imagesDir)
        if (!imageCache.has(srcUrl)) {
          imageCache.set(srcUrl, await compressImage(imagePage, srcUrl))
        }
        const compressed = imageCache.get(srcUrl)
        if (compressed) data[field] = compressed
      }

      const rowLabel =
        fileNamePattern && fileNamePattern.length > 0
          ? fileNamePattern.map((key) => data[key]).filter(Boolean).join(' ') || `Row ${i + 1}`
          : `Row ${i + 1}`
      const fileBaseName =
        fileNamePattern && fileNamePattern.length > 0
          ? fileNamePattern.map((key) => sanitizeForFilename(data[key])).join('_')
          : `row${i + 1}_${sanitizeForFilename(job.templateRef.id)}`
      const fileName = `${fileBaseName.toUpperCase()}.pdf`
      const outputFile = join(job.outputDir, fileName)

      try {
        const html = injectBaseHref(template(data), job.templateRef.dir)
        await writeFile(tempHtmlPath, html, 'utf-8')
        await page.goto(pathToFileURL(tempHtmlPath).toString(), { waitUntil: 'networkidle0' })
        await page.pdf({ path: outputFile, printBackground: true, ...pdfSize })

        progress.succeeded++
        post({ jobId, rowIndex: i, rowLabel, outputFile, status: 'success' } satisfies GenerateRowResult)
      } catch (err) {
        progress.failed++
        post({
          jobId,
          rowIndex: i,
          rowLabel,
          status: 'failed',
          error: err instanceof Error ? err.message : String(err)
        } satisfies GenerateRowResult)
      }

      progress.completed++
      progress.currentRow = rowLabel
      post({ ...progress })
    }
  } finally {
    await browser?.close()
    await rm(tempHtmlPath, { force: true })
  }

  post({ ...progress, done: true })
}

// The persistent parentPort 'message' listener above (for cancellation)
// keeps this thread's event loop alive indefinitely on its own, so it
// won't exit naturally once run() settles — end it explicitly either way.
run()
  .then(() => process.exit(0))
  .catch((err) => {
    parentPort?.postMessage({ fatalError: err instanceof Error ? err.message : String(err) })
    process.exit(1)
  })
