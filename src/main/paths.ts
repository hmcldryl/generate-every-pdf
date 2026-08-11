// Where the app keeps user-facing data on disk. Templates and images live
// under the user's Documents folder (not inside the app's install
// directory or userData) so they survive reinstalls/updates, are easy to
// find in Explorer, and can be backed up or synced like any other document.

import { access, cp, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { app } from 'electron'

const APP_FOLDER_NAME = 'GenerateEveryPDF'

function documentsRoot(): string {
  return join(app.getPath('documents'), APP_FOLDER_NAME)
}

/** Every folder directly under here is one template — see templates/README.md. */
export function templatesRoot(): string {
  return join(documentsRoot(), 'Templates')
}

/** Parent of every template's own image subfolder — see imagesDirForTemplate(). */
export function imagesRoot(): string {
  return join(documentsRoot(), 'Images')
}

/**
 * One template's own folder of image files, its `image`-type fields resolve
 * against: Documents/GenerateEveryPDF/Images/<template-name>/. A mapped sheet
 * cell holding just a filename (e.g. "jane.jpg") is looked up here at
 * generation time — see worker.ts's resolveImageUrl(). Keyed by templateId
 * (TemplateRef.id, the template's folder name) so same-named photos across
 * different templates don't collide.
 */
export function imagesDirForTemplate(templateId: string): string {
  return join(imagesRoot(), templateId)
}

// The template(s) shipped with the app itself, copied into Templates/ on
// first run only (see ensureAppDirs) so there's a working example without
// overwriting anything the user has since created or deleted there.
function bundledTemplatesDir(): string {
  return app.isPackaged ? join(process.resourcesPath, 'templates') : join(app.getAppPath(), 'templates')
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

/** Creates Templates/ and Images/ under Documents/GenerateEveryPDF if missing, seeding a starter template on first run. */
export async function ensureAppDirs(): Promise<void> {
  const templatesDir = templatesRoot()
  const firstRun = !(await exists(templatesDir))

  await mkdir(templatesDir, { recursive: true })
  await mkdir(imagesRoot(), { recursive: true })

  if (firstRun) {
    const bundled = join(bundledTemplatesDir(), 'sample-document')
    if (await exists(bundled)) {
      await cp(bundled, join(templatesDir, 'sample-document'), { recursive: true }).catch(() => {})
    }
  }
}

export interface StorageDirs {
  templatesDir: string
  imagesDir: string
}

export function getStorageDirs(): StorageDirs {
  return { templatesDir: templatesRoot(), imagesDir: imagesRoot() }
}
