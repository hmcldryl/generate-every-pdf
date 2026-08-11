import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'

export interface ParsedSheet {
  columns: string[]
  rows: Record<string, string>[]
}

// Excel on Windows commonly saves "CSV" as the system codepage (Windows-1252),
// not UTF-8, even though the file has no way to say so. Decoding that as
// UTF-8 doesn't throw — it just silently produces mojibake (the U+FFFD
// replacement character) wherever an accented letter or smart quote was.
// Detect that and fall back to Latin-1, which maps those same bytes 1:1
// onto the right code points for the accented Western-European letters
// (é, ñ, etc.) that show up in Filipino names/addresses.
function decodeCsvBuffer(buffer: Buffer): string {
  const bom = buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf
  const body = bom ? buffer.subarray(3) : buffer
  const utf8 = body.toString('utf-8')
  return utf8.includes('�') ? body.toString('latin1') : utf8
}

/** Parse an .xlsx or .csv file into column names + row objects. */
export async function parseSheetFile(filePath: string): Promise<ParsedSheet> {
  const ext = extname(filePath).toLowerCase()

  if (ext === '.csv') {
    const buffer = await readFile(filePath)
    const text = decodeCsvBuffer(buffer)
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
