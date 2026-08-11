// Runs in a worker_thread. Owns a single Puppeteer browser instance and
// renders one PDF per row, reporting progress back to the main thread via
// parentPort messages so the UI thread never blocks.

import { parentPort, workerData } from 'node:worker_threads'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { randomUUID } from 'node:crypto'
import puppeteer, { type Browser } from 'puppeteer'
import Handlebars from 'handlebars'
import type { GenerateJobConfig, GenerateProgress, GenerateRowResult } from '@shared/types'
import { registerTemplateHelpers } from './handlebarsHelpers'
import {
  IMAGE_PATH_RE,
  compressImage,
  injectBaseHref,
  pdfSizeOptions,
  readTemplateSettings,
  resolveImageUrl,
  sanitizeForFilename,
  sanitizeValue
} from './shared'

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

registerTemplateHelpers(Handlebars)

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
