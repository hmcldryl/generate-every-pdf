import { useState } from 'react'
import AppShell, { type Page } from './AppShell'
import WizardView from './views/WizardView'
import TemplatesView from './views/TemplatesView'
import SettingsView from './views/SettingsView'

export default function App(): JSX.Element {
  const [page, setPage] = useState<Page>('wizard')
  // Bumped whenever the wizard nav item is clicked so it remounts with fresh state.
  const [wizardKey, setWizardKey] = useState(0)

  function startWizard(): void {
    setWizardKey((k) => k + 1)
    setPage('wizard')
  }

  return (
    <AppShell page={page} onNavigate={(p) => (p === 'wizard' ? startWizard() : setPage(p))}>
      {page === 'wizard' && <WizardView key={wizardKey} onExit={() => setPage('templates')} />}
      {page === 'templates' && <TemplatesView />}
      {page === 'settings' && <SettingsView />}
    </AppShell>
  )
}
