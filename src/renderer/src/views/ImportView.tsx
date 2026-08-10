import { useState } from 'react'
import type { ImportedSheet } from '@shared/types'
import { IconArrowBack, IconFolderOpen } from '../components/Icon'

interface Props {
  onImported: (sheet: ImportedSheet) => void
  onBack: () => void
}

export default function ImportView({ onImported, onBack }: Props): JSX.Element {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  async function handlePickFile(): Promise<void> {
    setError(null)
    const filePath = await window.api.selectFile()
    if (!filePath) return

    setBusy(true)
    try {
      const sheet = await window.api.importSheet(filePath)
      setFileName(sheet.fileName)
      onImported(sheet)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="view">
      <h2>Import sheet</h2>
      <p>Works with .xlsx, .xls, or .csv files, from any spreadsheet software.</p>
      <button onClick={handlePickFile} disabled={busy}>
        {busy ? (
          'Importing…'
        ) : (
          <>
            <IconFolderOpen /> Choose file…
          </>
        )}
      </button>
      {fileName && <p>Imported: {fileName}</p>}
      {error && <p className="error">{error}</p>}
      <button onClick={onBack}>
        <IconArrowBack /> Back
      </button>
    </div>
  )
}
