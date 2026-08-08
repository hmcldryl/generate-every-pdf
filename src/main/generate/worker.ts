// Runs in a worker_thread. Owns a single Puppeteer browser instance and
// renders one PDF per row, reporting progress back to the main thread via
// parentPort messages so the UI thread never blocks.

import { parentPort, workerData } from 'node:worker_threads'
import { readFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import puppeteer, { type Browser } from 'puppeteer'
import Handlebars from 'handlebars'
import type { GenerateJobConfig, GenerateProgress, GenerateRowResult } from '@shared/types'

interface WorkerInput {
  job: GenerateJobConfig
  rows: Record<string, string>[]
}

function post(message: GenerateProgress | GenerateRowResult): void {
  parentPort?.postMessage(message)
}

function sanitizeForFilename(value: string): string {
  return (value || 'unknown').replace(/[\\/:*?"<>|]/g, '_').trim()
}

// Relative href/src in template.html (style.css, assets/*) resolve against
// this so page.setContent() doesn't need a real navigation per row.
function injectBaseHref(html: string, templateDir: string): string {
  const baseTag = `<base href="${pathToFileURL(templateDir + '/').toString()}">`
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (match) => `${match}${baseTag}`)
  }
  return baseTag + html
}

/** Field keys used to build each generated file's name, declared in template.json. */
async function readFileNamePattern(templateDir: string): Promise<string[] | undefined> {
  try {
    const raw = await readFile(join(templateDir, 'template.json'), 'utf-8')
    const config = JSON.parse(raw) as { fileNamePattern?: string[] }
    return config.fileNamePattern
  } catch {
    return undefined
  }
}

async function run(): Promise<void> {
  const { job, rows } = workerData as WorkerInput
  const jobId = job.sheetId + ':' + Date.now()

  await mkdir(job.outputDir, { recursive: true })

  const templateHtml = await readFile(join(job.templateRef.dir, 'template.html'), 'utf-8')
  const template = Handlebars.compile(templateHtml)
  const fileNamePattern = await readFileNamePattern(job.templateRef.dir)

  const progress: GenerateProgress = {
    jobId,
    total: rows.length,
    completed: 0,
    succeeded: 0,
    failed: 0,
    done: false
  }
  post(progress)

  let browser: Browser | null = null
  try {
    browser = await puppeteer.launch({ headless: true })
    const page = await browser.newPage()

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const data: Record<string, string> = {}
      for (const [templateField, sheetColumn] of Object.entries(job.mapping)) {
        data[templateField] = row[sheetColumn] ?? ''
      }

      const rowLabel =
        fileNamePattern && fileNamePattern.length > 0
          ? fileNamePattern.map((key) => data[key]).filter(Boolean).join(' ') || `Row ${i + 1}`
          : `Row ${i + 1}`
      const fileName =
        fileNamePattern && fileNamePattern.length > 0
          ? `${fileNamePattern.map((key) => sanitizeForFilename(data[key])).join('_')}.pdf`
          : `row${i + 1}_${sanitizeForFilename(job.templateRef.id)}.pdf`
      const outputFile = join(job.outputDir, fileName)

      try {
        const html = injectBaseHref(template(data), job.templateRef.dir)
        await page.setContent(html, { waitUntil: 'networkidle0' })
        await page.pdf({ path: outputFile, format: 'A4', printBackground: true })

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
  }

  post({ ...progress, done: true })
}

run().catch((err) => {
  parentPort?.postMessage({ fatalError: err instanceof Error ? err.message : String(err) })
})
