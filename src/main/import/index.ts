import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'

export interface ParsedSheet {
  columns: string[]
  rows: Record<string, string>[]
}

/** Parse an .xlsx or .csv file into column names + row objects. */
export async function parseSheetFile(filePath: string): Promise<ParsedSheet> {
  const ext = extname(filePath).toLowerCase()

  if (ext === '.csv') {
    const text = await readFile(filePath, 'utf-8')
    const result = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true
    })
    const columns = result.meta.fields ?? []
    return { columns, rows: result.data }
  }

  if (ext === '.xlsx' || ext === '.xls') {
    const buffer = await readFile(filePath)
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const firstSheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[firstSheetName]
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' })
    const columns = rows.length > 0 ? Object.keys(rows[0]) : []
    return { columns, rows }
  }

  throw new Error(`Unsupported file type: ${ext}`)
}
