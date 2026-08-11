// Generates exactly one PDF from field values entered directly in the UI —
// no sheet import, no column mapping. Runs in the main process like
// preview.ts: a single render doesn't need a worker_thread, there's no
// batch to keep the UI thread free for.

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import puppeteer from 'puppeteer'
import Handlebars from 'handlebars'
import type { GenerateSingleJobConfig, GenerateSingleResult } from '@shared/types'
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

registerTemplateHelpers(Handlebars)

export async function generateSingle(job: GenerateSingleJobConfig, imagesDir: string): Promise<GenerateSingleResult> {
  const { templateRef, outputDir } = job
  await mkdir(outputDir, { recursive: true })

  const templateHtml = await readFile(join(templateRef.dir, 'template.html'), 'utf-8')
  const template = Handlebars.compile(templateHtml)
  const settings = await readTemplateSettings(templateRef.dir)
  const pdfSize = pdfSizeOptions(settings.paperSize)

  const data: Record<string, string> = {}
  for (const [key, value] of Object.entries(job.data)) {
    data[key] = sanitizeValue(value ?? '')
  }

  const tempHtmlPath = join(tmpdir(), `generateeverypdf-single-${randomUUID()}.html`)

  let browser
  try {
    browser = await puppeteer.launch({ headless: true })
    const page = await browser.newPage()
    const imagePage = await browser.newPage()

    for (const [field, value] of Object.entries(data)) {
      if (!value || !IMAGE_PATH_RE.test(value.trim())) continue
      const srcUrl = resolveImageUrl(value.trim(), imagesDir)
      const compressed = await compressImage(imagePage, srcUrl)
      if (compressed) data[field] = compressed
    }

    const { fileNamePattern } = settings
    const fileBaseName =
      fileNamePattern && fileNamePattern.length > 0
        ? fileNamePattern.map((key) => sanitizeForFilename(data[key])).join('_')
        : `single_${sanitizeForFilename(templateRef.id)}_${Date.now()}`
    const fileName = `${fileBaseName.toUpperCase()}.pdf`
    const outputFile = join(outputDir, fileName)

    const html = injectBaseHref(template(data), templateRef.dir)
    await writeFile(tempHtmlPath, html, 'utf-8')
    await page.goto(pathToFileURL(tempHtmlPath).toString(), { waitUntil: 'networkidle0' })
    await page.pdf({ path: outputFile, printBackground: true, ...pdfSize })

    return { outputFile }
  } finally {
    await browser?.close()
    await rm(tempHtmlPath, { force: true })
  }
}
