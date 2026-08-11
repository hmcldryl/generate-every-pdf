import { useEffect, useState } from 'react'
import type { PaperSize, TemplateRef, TemplateSettings } from '@shared/types'
import TemplateFormView from './TemplateFormView'
import ConfirmModal from '../components/ConfirmModal'
import { IconDelete, IconEdit, IconFolderOpen } from '../components/Icon'

function formatPaperSize(size: PaperSize): string {
  return typeof size === 'string' ? size : `${size.width} × ${size.height}`
}

export default function TemplatesView(): JSX.Element {
  const [templates, setTemplates] = useState<TemplateRef[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [settings, setSettings] = useState<Record<string, TemplateSettings>>({})
  const [settingsError, setSettingsError] = useState<Record<string, string>>({})
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<TemplateRef | null>(null)
  const [deleting, setDeleting] = useState<TemplateRef | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function reload(): void {
    window.api.listTemplates().then(setTemplates)
  }

  async function confirmDelete(): Promise<void> {
    if (!deleting) return
    setDeleteBusy(true)
    setDeleteError(null)
    try {
      await window.api.deleteTemplate(deleting)
      if (expanded === deleting.id) setExpanded(null)
      setDeleting(null)
      reload()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : String(err))
    } finally {
      setDeleteBusy(false)
    }
  }

  useEffect(reload, [])

  function refreshExpanded(id: string): void {
    setSettings((prev) => {
      const { [id]: _drop, ...rest } = prev
      return rest
    })
  }

  if (creating) {
    return (
      <TemplateFormView
        onSaved={(t) => {
          setCreating(false)
          setExpanded(t.id)
          reload()
        }}
        onCancel={() => setCreating(false)}
      />
    )
  }

  if (editing) {
    return (
      <TemplateFormView
        templateRef={editing}
        onSaved={(t) => {
          setEditing(null)
          setExpanded(t.id)
          refreshExpanded(t.id)
          reload()
        }}
        onCancel={() => setEditing(null)}
      />
    )
  }

  async function toggleExpand(t: TemplateRef): Promise<void> {
    if (expanded === t.id) {
      setExpanded(null)
      return
    }
    setExpanded(t.id)
    if (!settings[t.id]) {
      try {
        const s = await window.api.getTemplateSettings(t)
        setSettings((prev) => ({ ...prev, [t.id]: s }))
      } catch (err) {
        setSettingsError((prev) => ({ ...prev, [t.id]: err instanceof Error ? err.message : String(err) }))
      }
    }
  }

  return (
    <div className="view">
      <div className="section-header">
        <h1>Templates</h1>
        <button className="cta" onClick={() => setCreating(true)}>
          + New template
        </button>
      </div>
      <p className="muted">
        A template is your document's layout: HTML with placeholder tags like <code>{'{{recipientName}}'}</code>{' '}
        that get filled in from a sheet column per row, plus its field list, start row, and paper size.
      </p>

      {templates.length === 0 && <p className="muted">No templates yet. Create one to get started.</p>}

      <ul className="template-cards">
        {templates.map((t) => (
          <li key={t.id} className="template-card">
            <div className="template-card-header" onClick={() => toggleExpand(t)}>
              <span className="template-year">{t.id}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setEditing(t)
                }}
              >
                <IconEdit /> Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  window.api.openOutputDir(t.dir)
                }}
              >
                <IconFolderOpen /> Open folder
              </button>
              <button
                className="danger"
                onClick={(e) => {
                  e.stopPropagation()
                  setDeleteError(null)
                  setDeleting(t)
                }}
              >
                <IconDelete /> Delete
              </button>
            </div>
            {expanded === t.id && (
              <div className="template-card-body">
                {!settings[t.id] && !settingsError[t.id] && <p className="muted">Loading settings…</p>}
                {settingsError[t.id] && <p className="error">{settingsError[t.id]}</p>}
                {settings[t.id] && (
                  <>
                    <p className="muted">
                      Starts at row {settings[t.id].startRow} · Paper size {formatPaperSize(settings[t.id].paperSize)}
                    </p>
                    {settings[t.id].fields.length === 0 && <p className="muted">No fields yet.</p>}
                    {settings[t.id].fields.length > 0 && (
                      <table>
                        <thead>
                          <tr>
                            <th>Key</th>
                            <th>Label</th>
                            <th>Type</th>
                            <th>Required</th>
                            <th>Mapped column</th>
                          </tr>
                        </thead>
                        <tbody>
                          {settings[t.id].fields.map((f) => (
                            <tr key={f.key}>
                              <td className="field-key">{f.key}</td>
                              <td>{f.label}</td>
                              <td>{f.type ?? 'text'}</td>
                              <td>{f.required ? 'Yes' : ''}</td>
                              <td>{settings[t.id].mapping[f.key] ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      {deleting && (
        <ConfirmModal
          title={`Delete "${deleting.id}"?`}
          message="This deletes the template's folder — HTML, CSS, settings, and assets — for good. This can't be undone."
          confirmLabel="Delete"
          danger
          busy={deleteBusy}
          error={deleteError}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  )
}
