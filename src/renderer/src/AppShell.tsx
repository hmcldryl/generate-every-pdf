import { useState, type ReactNode } from 'react'
import logo from './assets/icon.svg'
import AboutModal from './AboutModal'

export type Page = 'wizard' | 'single' | 'templates' | 'settings'

const NAV_ITEMS: { key: Page; label: string; icon: string }[] = [
  { key: 'wizard', label: 'New Batch', icon: '+' },
  { key: 'single', label: 'Single Document', icon: '⎘' },
  { key: 'templates', label: 'Templates', icon: '▤' },
  { key: 'settings', label: 'Settings', icon: '⚙' }
]

interface Props {
  page: Page
  onNavigate: (page: Page) => void
  children: ReactNode
}

export default function AppShell({ page, onNavigate, children }: Props): JSX.Element {
  const [aboutOpen, setAboutOpen] = useState(false)

  return (
    <div className="shell">
      <nav className="sidebar">
        <button className="brand" onClick={() => setAboutOpen(true)} title="About">
          <img className="brand-logo" src={logo} alt="Generate Every PDF" />
          {/* keep in sync with package.json version */}
          <span className="brand-name">generate every pdf!!! v1.1.0</span>
        </button>

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

      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </div>
  )
}
