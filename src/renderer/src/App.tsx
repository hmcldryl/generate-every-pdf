import { useState } from 'react'
import AppShell, { type Page } from './AppShell'
import DashboardView from './views/DashboardView'
import WizardView from './views/WizardView'
import TemplatesView from './views/TemplatesView'
import PresetsView from './views/PresetsView'
import HistoryView from './views/HistoryView'
import SettingsView from './views/SettingsView'

export default function App(): JSX.Element {
  const [page, setPage] = useState<Page>('dashboard')
  // Bumped whenever the wizard is (re)entered so it remounts with fresh state.
  const [wizardKey, setWizardKey] = useState(0)

  function startWizard(): void {
    setWizardKey((k) => k + 1)
    setPage('wizard')
  }

  return (
    <AppShell page={page} onNavigate={(p) => (p === 'wizard' ? startWizard() : setPage(p))}>
      {page === 'dashboard' && <DashboardView onStartWizard={startWizard} onNavigate={(p) => setPage(p)} />}
      {page === 'wizard' && <WizardView key={wizardKey} onExit={() => setPage('dashboard')} />}
      {page === 'templates' && <TemplatesView />}
      {page === 'presets' && <PresetsView />}
      {page === 'history' && <HistoryView />}
      {page === 'settings' && <SettingsView />}
    </AppShell>
  )
}
