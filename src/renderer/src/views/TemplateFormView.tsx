import { useEffect, useState } from 'react'
import type { PaperSize, TemplateFieldDef, TemplateRef } from '@shared/types'
import PaperSizeSelect from '../components/PaperSizeSelect'
import { IconCheck, IconClose, IconFolderOpen, IconSearch, IconVisibility } from '../components/Icon'

interface Props {
  // Pass an existing template to edit it in place; omit to create a new one.
  templateRef?: TemplateRef
  onSaved: (templateRef: TemplateRef) => void
  onCancel: () => void
}

const HTML_PLACEHOLDER = `<html>
  <head><link rel="stylesheet" href="style.css" /></head>
  <body>
    <h1>{{recipientName}}</h1>
    <p>{{date}}</p>
  </body>
</html>`

export default function TemplateFormView({ templateRef, onSaved, onCancel }: Props): JSX.Element {
  const editing = !!templateRef

  const [name, setName] = useState('')
  const [html, setHtml] = useState('')
  const [css, setCss] = useState('')
  const [fields, setFields] = useState<TemplateFieldDef[]>([])
  const [startRow, setStartRow] = useState(1)
  const [paperSize, setPaperSize] = useState<PaperSize>('A4')
  const [loading, setLoading] = useState(editing)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [detecting, setDetecting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  useEffect(() => {
    if (!templateRef) return
    setLoading(true)
    setLoadError(null)
    Promise.all([window.api.getTemplateSource(templateRef), window.api.getTemplateSettings(templateRef)])
      .then(([source, settings]) => {
        setName(templateRef.id)
        setHtml(source.html)
        setCss(source.css)
        setFields(settings.fields)
        setStartRow(settings.startRow)
        setPaperSize(settings.paperSize)
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }, [templateRef])

  async function loadHtmlFile(): Promise<void> {
    const content = await window.api.selectHtmlFile()
    if (content !== null) setHtml(content)
  }

  async function detectFields(): Promise<void> {
    if (!html.trim()) return
    setDetecting(true)
    try {
      const detected = await window.api.detectTemplateFields(html)
      setFields((existing) => detected.map((d) => existing.find((f) => f.key === d.key) ?? d))
    } finally {
      setDetecting(false)
    }
  }

  function addField(): void {
    setFields((f) => [...f, { key: '', label: '', required: false, type: 'text' }])
  }

  function updateField(index: number, patch: Partial<TemplateFieldDef>): void {
    setFields((f) => f.map((field, i) => (i === index ? { ...field, ...patch } : field)))
  }

  function removeField(index: number): void {
    setFields((f) => f.filter((_, i) => i !== index))
  }

  async function preview(): Promise<void> {
    setPreviewing(true)
    setPreviewError(null)
    try {
      const url = await window.api.previewTemplate({
        templateRef,
        html,
        css,
        fields: fields.filter((f) => f.key.trim()),
        paperSize
      })
      setPreviewUrl(url)
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : String(err))
    } finally {
      setPreviewing(false)
    }
  }

  const canSave = (editing || name.trim().length > 0) && html.trim().length > 0 && !saving

  async function save(): Promise<void> {
    setSaving(true)
    setError(null)
    try {
      const cleanFields = fields.filter((f) => f.key.trim())
      const saved = templateRef
        ? await window.api.updateTemplate(templateRef, { html, css, fields: cleanFields, startRow, paperSize })
        : await window.api.createTemplate({ name, html, css, fields: cleanFields, startRow, paperSize })
      onSaved(saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="view">
        <h2>Edit template</h2>
        <p>Loading template…</p>
      </div>
    )
  }

  return (
    <div className="view">
      <h2>{editing ? `Edit template: ${templateRef!.id}` : 'New template'}</h2>

      {loadError && <p className="error">{loadError}</p>}

      {!editing && (
        <div className="settings-row">
          <div>
            <strong>Template name</strong>
            <p className="muted">This becomes the template's folder name.</p>
          </div>
          <div className="settings-control">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Certificate" />
          </div>
        </div>
      )}

      <div className="settings-row">
        <div>
          <strong>HTML</strong>
          <p className="muted">
            Write or paste your HTML here, with placeholder tags like <code>{'{{recipientName}}'}</code>.
          </p>
        </div>
        <div className="settings-control">
          <button onClick={loadHtmlFile}>
            <IconFolderOpen /> Load from file…
          </button>
        </div>
      </div>
      <textarea
        rows={14}
        className="html-editor"
        value={html}
        onChange={(e) => setHtml(e.target.value)}
        placeholder={HTML_PLACEHOLDER}
        spellCheck={false}
      />

      <div className="settings-row">
        <div>
          <strong>CSS</strong>
          <p className="muted">Styles for the HTML above, linked as style.css.</p>
        </div>
      </div>
      <textarea
        rows={8}
        className="html-editor"
        value={css}
        onChange={(e) => setCss(e.target.value)}
        placeholder="body { font-family: sans-serif; }"
        spellCheck={false}
      />

      <div className="nav-row">
        <button onClick={detectFields} disabled={!html.trim() || detecting}>
          {detecting ? (
            'Detecting…'
          ) : (
            <>
              <IconSearch /> Detect placeholder fields
            </>
          )}
        </button>
        <button onClick={addField}>+ Add field</button>
      </div>
      <p className="muted">
        Type is a label for you, not enforced by the app: <strong>Text</strong> prints the mapped value as-is.{' '}
        <strong>Checkbox</strong> — in the HTML, compare it with the <code>eq</code>/<code>notEmpty</code> helper,
        e.g. <code>{'{{#if (eq attending "Yes")}}'}</code>. <strong>Image</strong> — the mapped sheet cell holds
        just a filename (e.g. <code>jane.jpg</code>), looked up in this template's own subfolder under the
        Images folder at generation time (see Settings).
      </p>

      {fields.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Key</th>
              <th>Label</th>
              <th>Type</th>
              <th>Required</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {fields.map((field, i) => (
              <tr key={i}>
                <td>
                  <input value={field.key} onChange={(e) => updateField(i, { key: e.target.value })} />
                </td>
                <td>
                  <input value={field.label} onChange={(e) => updateField(i, { label: e.target.value })} />
                </td>
                <td>
                  <select
                    value={field.type ?? 'text'}
                    onChange={(e) => updateField(i, { type: e.target.value as TemplateFieldDef['type'] })}
                  >
                    <option value="text">Text</option>
                    <option value="checkbox">Checkbox</option>
                    <option value="image">Image</option>
                  </select>
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={field.required ?? false}
                    onChange={(e) => updateField(i, { required: e.target.checked })}
                  />
                </td>
                <td>
                  <button onClick={() => removeField(i)}>
                    <IconClose /> Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

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

      <div className="settings-row">
        <div>
          <strong>Preview</strong>
          <p className="muted">
            Renders the HTML and CSS above with each field's label standing in for its value — checkboxes show
            unchecked since there's no real row to compare against yet.
          </p>
        </div>
        <div className="settings-control">
          <button onClick={preview} disabled={!html.trim() || previewing}>
            {previewing ? (
              'Rendering…'
            ) : (
              <>
                <IconVisibility /> Preview
              </>
            )}
          </button>
        </div>
      </div>
      {previewError && <p className="error">{previewError}</p>}
      {previewUrl && (
        <div className="template-preview">
          <img src={previewUrl} alt="Template preview" />
        </div>
      )}

      {error && <p className="error">{error}</p>}

      <div className="nav-row">
        <button onClick={onCancel}>
          <IconClose /> Cancel
        </button>
        <button disabled={!canSave} onClick={save}>
          {saving ? (
            'Saving…'
          ) : (
            <>
              <IconCheck /> {editing ? 'Save changes' : 'Create template'}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
