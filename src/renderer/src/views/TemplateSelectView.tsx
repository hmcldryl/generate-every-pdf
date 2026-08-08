import { useEffect, useState } from 'react'
import type { TemplateRef } from '@shared/types'

interface Props {
  onSelect: (templateRef: TemplateRef) => void
  onBack: () => void
}

export default function TemplateSelectView({ onSelect, onBack }: Props): JSX.Element {
  const [templates, setTemplates] = useState<TemplateRef[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    window.api
      .listTemplates()
      .then(setTemplates)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="view">
      <h2>Select template</h2>
      {loading && <p>Loading templates…</p>}
      {!loading && templates.length === 0 && (
        <p>
          No templates found. Add a folder under <code>templates/</code> with <code>template.html</code> and{' '}
          <code>style.css</code>.
        </p>
      )}
      <ul className="template-list">
        {templates.map((t) => (
          <li key={t.id}>
            <button onClick={() => onSelect(t)}>{t.id}</button>
          </li>
        ))}
      </ul>
      <button onClick={onBack}>Back</button>
    </div>
  )
}
