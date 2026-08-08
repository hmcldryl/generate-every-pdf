import { randomUUID } from 'node:crypto'
import { getDb } from '../db'
import { parseSheetFile } from '../import'
import type { ImportedSheet } from '@shared/types'

export async function importSheetFile(filePath: string): Promise<ImportedSheet> {
  const { columns, rows } = await parseSheetFile(filePath)
  const db = getDb()

  const sheet: ImportedSheet = {
    id: randomUUID(),
    fileName: filePath.split(/[\\/]/).pop() ?? filePath,
    importedAt: new Date().toISOString(),
    columns,
    rowCount: rows.length
  }

  db.prepare(
    `INSERT INTO sheets (id, file_name, imported_at, columns_json, rows_json) VALUES (?, ?, ?, ?, ?)`
  ).run(sheet.id, sheet.fileName, sheet.importedAt, JSON.stringify(columns), JSON.stringify(rows))

  return sheet
}

export function getSheetRows(sheetId: string): Record<string, string>[] {
  const db = getDb()
  const row = db.prepare(`SELECT rows_json FROM sheets WHERE id = ?`).get(sheetId) as
    | { rows_json: string }
    | undefined
  if (!row) throw new Error(`Sheet not found: ${sheetId}`)
  return JSON.parse(row.rows_json) as Record<string, string>[]
}
