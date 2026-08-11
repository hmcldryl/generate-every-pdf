import { useEffect, useState } from 'react'
import type { FieldMapping, ImportedSheet, PaperSize, TemplateFieldDef, TemplateRef } from '@shared/types'
import PaperSizeSelect from '../components/PaperSizeSelect'
import { IconArrowBack, IconCheck, IconClose, IconEdit, IconSwapHoriz } from '../components/Icon'

interface Props {
  sheet: ImportedSheet
  onNext: (templateRef: TemplateRef) => void
  onBack: () => void
}

// Template pick + its mapping/startRow/paperSize settings, as one wizard
// step — picking a template and configuring how it reads the sheet are the
// same decision, not two.
export default function TemplateStepView({ sheet, onNext, onBack }: Props): JSX.Element {
  const [templates, setTemplates] = useState<TemplateRef[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(true)
  const [templateRef, setTemplateRef] = useState<TemplateRef | null>(null)

  const [fields, setFields] = useState<TemplateFieldDef[]>([])
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [mapping, setMapping] = useState<FieldMapping>({})
  const [startRow, setStartRow] = useState(1)
  const [paperSize, setPaperSize] = useState<PaperSize>('A4')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [jsonMode, setJsonMode] = useState(false)
  const [jsonDraft, setJsonDraft] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)

  useEffect(() => {
    setTemplatesLoading(true)
    window.api
      .listTemplates()
      .then(setTemplates)
      .finally(() => setTemplatesLoading(false))
  }, [])

  useEffect(() => {
    if (!templateRef) return
    setSettingsLoading(true)
    setLoadError(null)
    window.api
      .getTemplateSettings(templateRef)
      .then((settings) => {
        setFields(settings.fields)
        setMapping(settings.mapping)
        setStartRow(settings.startRow)
        setPaperSize(settings.paperSize)
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : String(err)))
      .finally(() => setSettingsLoading(false))
  }, [templateRef])

  function setField(field: string, column: string): void {
    setMapping((m) => ({ ...m, [field]: column }))
  }

  function openJsonEditor(): void {
    setJsonDraft(JSON.stringify(mapping, null, 2))
    setJsonError(null)
    setJsonMode(true)
  }

  function applyJsonEditor(): void {
    try {
      const parsed = JSON.parse(jsonDraft)
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('Mapping JSON must be an object of { templateField: sheetColumn }')
      }
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v !== 'string') throw new Error(`Value for "${k}" must be a string (sheet column name)`)
      }
      setMapping(parsed as FieldMapping)
      setJsonError(null)
      setJsonMode(false)
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : String(err))
    }
  }

  const requiredFields = fields.filter((f) => f.required)
  const canProceed = fields.length > 0 && requiredFields.every((f) => mapping[f.key]) && startRow >= 1

  async function saveAndNext(): Promise<void> {
    if (!templateRef) return
    setSaving(true)
    setSaveError(null)
    try {
      await window.api.saveTemplateSettings(templateRef, { mapping, startRow, paperSize })
      onNext(templateRef)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  if (!templateRef) {
    return (
      <div className="view">
        <h2>Select template</h2>
        {templatesLoading && <p>Loading templates…</p>}
        {!templatesLoading && templates.length === 0 && (
          <p>No templates yet. Head to the Templates page and create one first.</p>
        )}
        <ul className="template-list">
          {templates.map((t) => (
            <li key={t.id}>
              <button onClick={() => setTemplateRef(t)}>{t.id}</button>
            </li>
          ))}
        </ul>
        <button onClick={onBack}>
          <IconArrowBack /> Back
        </button>
      </div>
    )
  }

  return (
    <div className="view">
      <h2>Template settings</h2>
      <p>
        {sheet.fileName} ({sheet.rowCount} rows) → {templateRef.id}{' '}
        <button onClick={() => setTemplateRef(null)}>
          <IconSwapHoriz /> Change template
        </button>
      </p>
      <p className="muted">
        Saved to <code>{templateRef.dir}\template.json</code>, so it's ready next time you use this template.
      </p>

      {settingsLoading && <p>Loading template settings…</p>}
      {loadError && <p className="error">{loadError}</p>}

      {!settingsLoading && !loadError && fields.length === 0 && (
        <p>This template has no fields yet, so there's nothing to map. Add placeholder tags to its HTML first.</p>
      )}

      {!settingsLoading && !loadError && (
        <>
          <div className="settings-row">
            <div>
              <strong>Sheet row data starts on</strong>
              <p className="muted">Counts data rows only, header excluded, starting from 1.</p>
            </div>
            <div className="settings-control">
              <input
                type="number"
                min={1}
                value={startRow}
                onChange={(e) => setStartRow(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
          </div>

          <div className="settings-row">
            <div>
              <strong>Paper size</strong>
            </div>
            <div className="settings-control">
              <PaperSizeSelect value={paperSize} onChange={setPaperSize} />
            </div>
          </div>

          {!jsonMode && fields.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>Template field</th>
                  <th>Sheet column</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field) => (
                  <tr key={field.key}>
                    <td>
                      {field.label}
                      {field.required && <span title="required"> *</span>}
                      {field.type && field.type !== 'text' && <span className="badge"> {field.type}</span>}
                      <div className="field-key">{field.key}</div>
                    </td>
                    <td>
                      <select value={mapping[field.key] ?? ''} onChange={(e) => setField(field.key, e.target.value)}>
                        <option value="">—</option>
                        {sheet.columns.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {jsonMode && (
            <div className="json-editor">
              <textarea rows={10} value={jsonDraft} onChange={(e) => setJsonDraft(e.target.value)} spellCheck={false} />
              {jsonError && <p className="error">{jsonError}</p>}
              <div className="nav-row">
                <button onClick={applyJsonEditor}>
                  <IconCheck /> Apply
                </button>
                <button onClick={() => setJsonMode(false)}>
                  <IconClose /> Cancel
                </button>
              </div>
            </div>
          )}

          {!jsonMode && (
            <button onClick={openJsonEditor}>
              <IconEdit /> Edit mapping as JSON
            </button>
          )}
        </>
      )}

      {saveError && <p className="error">{saveError}</p>}

      <div className="nav-row">
        <button onClick={() => setTemplateRef(null)}>
          <IconArrowBack /> Back
        </button>
        <button disabled={!canProceed || saving} onClick={saveAndNext}>
          {saving ? (
            'Saving…'
          ) : (
            <>
              <IconCheck /> Save & Next
            </>
          )}
        </button>
      </div>
    </div>
  )
}
