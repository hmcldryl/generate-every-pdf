import { useEffect, useState } from 'react'
import type { TemplateFieldDef, TemplateRef } from '@shared/types'

export default function TemplatesView(): JSX.Element {
  const [templates, setTemplates] = useState<TemplateRef[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, TemplateFieldDef[]>>({})

  useEffect(() => {
    window.api.listTemplates().then(setTemplates)
  }, [])

  async function toggleExpand(t: TemplateRef): Promise<void> {
    if (expanded === t.id) {
      setExpanded(null)
      return
    }
    setExpanded(t.id)
    if (!fields[t.id]) {
      const f = await window.api.getTemplateFields(t)
      setFields((prev) => ({ ...prev, [t.id]: f }))
    }
  }

  return (
    <div className="view">
      <h1>Templates</h1>
      <p className="muted">
        One folder per template under <code>templates/{'{name}'}</code> — <code>template.html</code>,{' '}
        <code>style.css</code>, and an optional <code>template.json</code> (field schema + file naming). Add a
        folder to add a template — no code changes needed.
      </p>

      {templates.length === 0 && (
        <p className="muted">
          No templates found. Add a folder under <code>templates/</code>.
        </p>
      )}

      <ul className="template-cards">
        {templates.map((t) => (
          <li key={t.id} className="template-card">
            <div className="template-card-header" onClick={() => toggleExpand(t)}>
              <span className="template-year">{t.id}</span>
              <span className="template-path">{t.dir}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  window.api.openOutputDir(t.dir)
                }}
              >
                Open folder
              </button>
            </div>
            {expanded === t.id && (
              <div className="template-card-body">
                {!fields[t.id] && <p className="muted">Loading fields…</p>}
                {fields[t.id] && fields[t.id].length === 0 && <p className="muted">No fields declared.</p>}
                {fields[t.id] && fields[t.id].length > 0 && (
                  <table>
                    <thead>
                      <tr>
                        <th>Key</th>
                        <th>Label</th>
                        <th>Required</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fields[t.id].map((f) => (
                        <tr key={f.key}>
                          <td className="field-key">{f.key}</td>
                          <td>{f.label}</td>
                          <td>{f.required ? 'Yes' : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
