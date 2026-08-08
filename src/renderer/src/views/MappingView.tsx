import { useEffect, useState } from 'react'
import type { FieldMapping, ImportedSheet, MappingPreset, TemplateFieldDef, TemplateRef } from '@shared/types'

interface Props {
  sheet: ImportedSheet
  templateRef: TemplateRef
  onNext: (mapping: FieldMapping) => void
  onBack: () => void
}

export default function MappingView({ sheet, templateRef, onNext, onBack }: Props): JSX.Element {
  const [fields, setFields] = useState<TemplateFieldDef[]>([])
  const [fieldsLoading, setFieldsLoading] = useState(true)
  const [fieldsError, setFieldsError] = useState<string | null>(null)
  const [mapping, setMapping] = useState<FieldMapping>({})
  const [presets, setPresets] = useState<MappingPreset[]>([])
  const [presetName, setPresetName] = useState('')

  const [jsonMode, setJsonMode] = useState(false)
  const [jsonDraft, setJsonDraft] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)

  useEffect(() => {
    setFieldsLoading(true)
    setFieldsError(null)
    window.api
      .getTemplateFields(templateRef)
      .then(setFields)
      .catch((err) => setFieldsError(err instanceof Error ? err.message : String(err)))
      .finally(() => setFieldsLoading(false))
  }, [templateRef])

  useEffect(() => {
    window.api.listMappingPresets(templateRef.id).then(setPresets)
  }, [templateRef.id])

  function applyPreset(preset: MappingPreset): void {
    setMapping(preset.mapping)
  }

  function setField(field: string, column: string): void {
    setMapping((m) => ({ ...m, [field]: column }))
  }

  async function savePreset(): Promise<void> {
    if (!presetName.trim()) return
    const preset = await window.api.saveMappingPreset(presetName.trim(), templateRef.id, mapping)
    setPresets((p) => [preset, ...p])
    setPresetName('')
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
  const canProceed = fields.length > 0 && requiredFields.every((f) => mapping[f.key])

  return (
    <div className="view">
      <h2>Map columns → template fields</h2>
      <p>
        {sheet.fileName} ({sheet.rowCount} rows) → {templateRef.id}
      </p>

      {fieldsLoading && <p>Loading field schema…</p>}
      {fieldsError && <p className="error">{fieldsError}</p>}
      {!fieldsLoading && !fieldsError && fields.length === 0 && (
        <p>
          No fields declared for this template. Add <code>template.json</code> to <code>templates/{templateRef.id}/</code>
          , e.g. <code>{'{"fields":[{"key":"invoiceNumber","label":"Invoice Number","required":true}]}'}</code>.
        </p>
      )}

      {presets.length > 0 && (
        <div className="preset-row">
          <label>Load preset: </label>
          <select
            onChange={(e) => {
              const preset = presets.find((p) => p.id === e.target.value)
              if (preset) applyPreset(preset)
            }}
          >
            <option value="">—</option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

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
            <button onClick={applyJsonEditor}>Apply</button>
            <button onClick={() => setJsonMode(false)}>Cancel</button>
          </div>
        </div>
      )}

      {!jsonMode && <button onClick={openJsonEditor}>Edit mapping as JSON</button>}

      <div className="save-preset-row">
        <input
          placeholder={`Preset name (e.g. "${templateRef.id} default")`}
          value={presetName}
          onChange={(e) => setPresetName(e.target.value)}
        />
        <button onClick={savePreset}>Save as preset</button>
      </div>

      <div className="nav-row">
        <button onClick={onBack}>Back</button>
        <button disabled={!canProceed} onClick={() => onNext(mapping)}>
          Next
        </button>
      </div>
    </div>
  )
}
