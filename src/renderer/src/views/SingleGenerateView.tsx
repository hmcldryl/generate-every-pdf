import { useEffect, useState } from 'react'
import type { GenerateSingleResult, TemplateFieldDef, TemplateRef } from '@shared/types'
import { IconArrowBack, IconFolderOpen, IconPlayArrow, IconRefresh, IconSwapHoriz } from '../components/Icon'

// One-off counterpart to the Import → Template → Generate wizard: pick a
// template, type the field values straight into a form (no sheet, no
// mapping), generate exactly one PDF. Good for the odd single document
// that doesn't warrant a whole spreadsheet row.
export default function SingleGenerateView(): JSX.Element {
  const [templates, setTemplates] = useState<TemplateRef[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(true)
  const [templateRef, setTemplateRef] = useState<TemplateRef | null>(null)

  const [fields, setFields] = useState<TemplateFieldDef[]>([])
  const [fieldsLoading, setFieldsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})

  const [outputDir, setOutputDir] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GenerateSingleResult | null>(null)

  useEffect(() => {
    setTemplatesLoading(true)
    window.api
      .listTemplates()
      .then(setTemplates)
      .finally(() => setTemplatesLoading(false))
  }, [])

  useEffect(() => {
    window.api.getSettings().then((s) => {
      if (s.defaultOutputDir) setOutputDir(s.defaultOutputDir)
    })
  }, [])

  useEffect(() => {
    if (!templateRef) return
    setFieldsLoading(true)
    setLoadError(null)
    setResult(null)
    window.api
      .getTemplateSettings(templateRef)
      .then((settings) => {
        setFields(settings.fields)
        const initial: Record<string, string> = {}
        for (const f of settings.fields) initial[f.key] = ''
        setValues(initial)
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : String(err)))
      .finally(() => setFieldsLoading(false))
  }, [templateRef])

  function setValue(key: string, value: string): void {
    setValues((v) => ({ ...v, [key]: value }))
  }

  async function pickOutputDir(): Promise<void> {
    const dir = await window.api.selectOutputDir()
    if (dir) setOutputDir(dir)
  }

  const requiredFields = fields.filter((f) => f.required)
  const canGenerate = !!templateRef && !!outputDir && requiredFields.every((f) => values[f.key]?.trim())

  async function generate(): Promise<void> {
    if (!templateRef || !outputDir) return
    setGenerating(true)
    setError(null)
    setResult(null)
    try {
      const res = await window.api.generateSingle({ templateRef, data: values, outputDir })
      setResult(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setGenerating(false)
    }
  }

  function reset(): void {
    setTemplateRef(null)
    setFields([])
    setValues({})
    setResult(null)
    setError(null)
  }

  if (!templateRef) {
    return (
      <div className="view">
        <h2>Generate single document</h2>
        <p className="muted">
          Pick a template and type the field values in directly — no spreadsheet needed. For a batch of rows,
          use New Batch instead.
        </p>
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
      </div>
    )
  }

  return (
    <div className="view">
      <h2>Generate single document</h2>
      <p>
        Template: {templateRef.id}{' '}
        <button onClick={reset}>
          <IconSwapHoriz /> Change template
        </button>
      </p>

      {fieldsLoading && <p>Loading template fields…</p>}
      {loadError && <p className="error">{loadError}</p>}

      {!fieldsLoading && !loadError && fields.length === 0 && (
        <p>This template has no fields declared, so there's nothing to fill in.</p>
      )}

      {!fieldsLoading && !loadError && fields.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Field</th>
              <th>Value</th>
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
                  <input
                    type="text"
                    value={values[field.key] ?? ''}
                    onChange={(e) => setValue(field.key, e.target.value)}
                    placeholder={field.type === 'image' ? 'filename.jpg' : ''}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="output-dir-row">
        <button onClick={pickOutputDir} disabled={generating}>
          <IconFolderOpen /> Choose output folder…
        </button>
        {outputDir && <span>{outputDir}</span>}
      </div>

      {error && <p className="error">{error}</p>}

      <div className="nav-row">
        <button onClick={generate} disabled={!canGenerate || generating}>
          {generating ? (
            'Generating…'
          ) : (
            <>
              <IconPlayArrow /> Generate PDF
            </>
          )}
        </button>
        <button onClick={reset} disabled={generating}>
          <IconArrowBack /> Back
        </button>
      </div>

      {result && (
        <div className="progress">
          <p>Done — {result.outputFile}</p>
          <div className="nav-row">
            <button onClick={() => window.api.openOutputDir(result.outputFile)}>
              <IconFolderOpen /> Open PDF
            </button>
            <button onClick={() => outputDir && window.api.openOutputDir(outputDir)}>
              <IconFolderOpen /> Open output folder
            </button>
            <button onClick={reset}>
              <IconRefresh /> Generate another
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
