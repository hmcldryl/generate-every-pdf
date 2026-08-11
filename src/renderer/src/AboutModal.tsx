import logo from './assets/icon.svg'

// Keep these in sync with package.json. Shared with SettingsView's About
// section so both surfaces say the same thing about the app.
export const VERSION = '0.1.0'
export const DESCRIPTION = 'Batch-generate PDFs from spreadsheet data using your own HTML/CSS templates.'
export const AUTHOR = 'John Daryl Homecillo'
export const LICENSE = 'MIT'

interface Props {
  onClose: () => void
}

export default function AboutModal({ onClose }: Props): JSX.Element {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <img className="modal-logo" src={logo} alt="Generate Every PDF" />
        <h2 className="modal-title">generate every pdf!!!</h2>
        <p className="muted">v{VERSION}</p>
        <p>{DESCRIPTION}</p>
        <p className="muted">
          {AUTHOR} · {LICENSE} license
        </p>
      </div>
    </div>
  )
}
