import { useEffect, useState } from 'react'
import type { MappingPreset } from '@shared/types'

export default function PresetsView(): JSX.Element {
  const [presets, setPresets] = useState<MappingPreset[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  function reload(): void {
    setLoading(true)
    window.api
      .listAllMappingPresets()
      .then(setPresets)
      .finally(() => setLoading(false))
  }

  useEffect(reload, [])

  async function remove(id: string): Promise<void> {
    await window.api.deleteMappingPreset(id)
    setPresets((p) => p.filter((preset) => preset.id !== id))
  }

  return (
    <div className="view">
      <h1>Mapping presets</h1>
      <p className="muted">Saved column → field mappings, reusable across batches with the same sheet layout.</p>

      {loading && <p className="muted">Loading…</p>}
      {!loading && presets.length === 0 && <p className="muted">No presets saved yet. Save one from the mapping step.</p>}

      <ul className="preset-cards">
        {presets.map((p) => (
          <li key={p.id} className="preset-card">
            <div className="preset-card-header" onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
              <div>
                <strong>{p.name}</strong>
                <span className="muted"> · {p.templateId}</span>
              </div>
              <div className="preset-card-actions">
                <span className="muted">{new Date(p.createdAt).toLocaleDateString()}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    remove(p.id)
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
            {expanded === p.id && <pre className="json-preview">{JSON.stringify(p.mapping, null, 2)}</pre>}
          </li>
        ))}
      </ul>
    </div>
  )
}
