import { useEffect, useState } from 'react'
import type { AppSettings } from '@shared/types'

export default function SettingsView(): JSX.Element {
  const [settings, setSettings] = useState<AppSettings>({})
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    window.api.getSettings().then(setSettings)
  }, [])

  async function pickDefaultOutputDir(): Promise<void> {
    const dir = await window.api.selectOutputDir()
    if (!dir) return
    const updated = await window.api.setSetting('defaultOutputDir', dir)
    setSettings(updated)
    flashSaved()
  }

  async function clearDefaultOutputDir(): Promise<void> {
    const updated = await window.api.setSetting('defaultOutputDir', undefined)
    setSettings(updated)
    flashSaved()
  }

  function flashSaved(): void {
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="view">
      <h1>Settings</h1>

      <div className="settings-section">
        <h2>Output</h2>
        <div className="settings-row">
          <div>
            <strong>Default output folder</strong>
            <p className="muted">Pre-filled at the generate step of every new batch.</p>
          </div>
          <div className="settings-control">
            <span className="field-key">{settings.defaultOutputDir ?? 'Not set'}</span>
            <button onClick={pickDefaultOutputDir}>Change…</button>
            {settings.defaultOutputDir && <button onClick={clearDefaultOutputDir}>Clear</button>}
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2>About</h2>
        <div className="settings-row">
          <div>
            <strong>Templates &amp; mappings</strong>
            <p className="muted">
              Templates live in <code>templates/{'{name}'}</code>. Mapping presets and generation history are
              stored locally in SQLite.
            </p>
          </div>
        </div>
      </div>

      {saved && <p className="save-toast">Saved.</p>}
    </div>
  )
}
