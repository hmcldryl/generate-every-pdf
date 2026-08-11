import { useState } from 'react'
import AppShell, { type Page } from './AppShell'
import WizardView from './views/WizardView'
import SingleGenerateView from './views/SingleGenerateView'
import TemplatesView from './views/TemplatesView'
import SettingsView from './views/SettingsView'

export default function App(): JSX.Element {
  const [page, setPage] = useState<Page>('wizard')
  // Bumped whenever the wizard/single-document nav item is clicked so it
  // remounts with fresh state, same as starting over from scratch.
  const [wizardKey, setWizardKey] = useState(0)
  const [singleKey, setSingleKey] = useState(0)

  function navigate(p: Page): void {
    if (p === 'wizard') setWizardKey((k) => k + 1)
    if (p === 'single') setSingleKey((k) => k + 1)
    setPage(p)
  }

  return (
    <AppShell page={page} onNavigate={navigate}>
      {page === 'wizard' && <WizardView key={wizardKey} onExit={() => setPage('templates')} />}
      {page === 'single' && <SingleGenerateView key={singleKey} />}
      {page === 'templates' && <TemplatesView />}
      {page === 'settings' && <SettingsView />}
    </AppShell>
  )
}
