import { useEffect, useState } from 'react'
import type { AppSettings, StorageDirs } from '@shared/types'
import { AUTHOR, DESCRIPTION, LICENSE, VERSION } from '../AboutModal'
import logo from '../assets/icon.svg'
import { IconClose, IconEdit, IconFolderOpen } from '../components/Icon'

export default function SettingsView(): JSX.Element {
  const [settings, setSettings] = useState<AppSettings>({})
  const [storageDirs, setStorageDirs] = useState<StorageDirs | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    window.api.getSettings().then(setSettings)
    window.api.getStorageDirs().then(setStorageDirs)
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
            <p className="muted">Filled in automatically at the generate step of every new batch.</p>
          </div>
          <div className="settings-control">
            <span className="field-key">{settings.defaultOutputDir ?? 'Not set'}</span>
            <button onClick={pickDefaultOutputDir}>
              <IconEdit /> Change…
            </button>
            {settings.defaultOutputDir && (
              <button onClick={clearDefaultOutputDir}>
                <IconClose /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2>Storage</h2>
        <div className="settings-row">
          <div>
            <strong>Templates folder</strong>
            <p className="muted">Every template lives in its own folder here. Add or edit a folder to add a template.</p>
          </div>
          <div className="settings-control">
            <span className="field-key">{storageDirs?.templatesDir ?? '…'}</span>
            <button disabled={!storageDirs} onClick={() => storageDirs && window.api.openOutputDir(storageDirs.templatesDir)}>
              <IconFolderOpen /> Open folder
            </button>
          </div>
        </div>
        <div className="settings-row">
          <div>
            <strong>Images folder</strong>
            <p className="muted">
              Drop image files here. An "image"-type field's mapped sheet cell only needs the filename (e.g.
              <code> jane.jpg</code>) — the generator looks it up here.
            </p>
          </div>
          <div className="settings-control">
            <span className="field-key">{storageDirs?.imagesDir ?? '…'}</span>
            <button disabled={!storageDirs} onClick={() => storageDirs && window.api.openOutputDir(storageDirs.imagesDir)}>
              <IconFolderOpen /> Open folder
            </button>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2>About</h2>
        <div className="about-row">
          <img className="about-logo" src={logo} alt="Generate Every PDF" />
          <div>
            <strong>generate every pdf!!! · v{VERSION}</strong>
            <p className="muted">{DESCRIPTION}</p>
            <p className="muted">
              {AUTHOR} · {LICENSE} license
            </p>
          </div>
        </div>
      </div>

      {saved && <p className="save-toast">Saved.</p>}
    </div>
  )
}
