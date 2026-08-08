import type { ReactNode } from 'react'

export type Page = 'dashboard' | 'wizard' | 'templates' | 'presets' | 'history' | 'settings'

const NAV_ITEMS: { key: Page; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '⌂' },
  { key: 'wizard', label: 'New Batch', icon: '+' },
  { key: 'templates', label: 'Templates', icon: '▤' },
  { key: 'presets', label: 'Mapping Presets', icon: '⇄' },
  { key: 'history', label: 'History', icon: '↺' },
  { key: 'settings', label: 'Settings', icon: '⚙' }
]

interface Props {
  page: Page
  onNavigate: (page: Page) => void
  children: ReactNode
}

export default function AppShell({ page, onNavigate, children }: Props): JSX.Element {
  return (
    <div className="shell">
      <nav className="sidebar">
        <div className="brand">
          <span className="brand-mark">GE</span>
          <span className="brand-name">GenerateEveryPDF</span>
        </div>

        <ul className="nav-list">
          {NAV_ITEMS.map((item) => (
            <li key={item.key}>
              <button
                className={item.key === page ? 'nav-item active' : 'nav-item'}
                onClick={() => onNavigate(item.key)}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <main className="content">{children}</main>
    </div>
  )
}
