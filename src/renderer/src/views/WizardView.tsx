import { useState } from 'react'
import type { GenerateJobConfig, ImportedSheet, TemplateRef } from '@shared/types'
import ImportView from './ImportView'
import TemplateStepView from './TemplateStepView'
import GenerateView from './GenerateView'

type Step = 'import' | 'template' | 'generate'

const STEPS: { key: Step; label: string }[] = [
  { key: 'import', label: 'Import sheet' },
  { key: 'template', label: 'Template' },
  { key: 'generate', label: 'Generate' }
]

interface Props {
  onExit: () => void
}

export default function WizardView({ onExit }: Props): JSX.Element {
  const [step, setStep] = useState<Step>('import')
  const [sheet, setSheet] = useState<ImportedSheet | null>(null)
  const [templateRef, setTemplateRef] = useState<TemplateRef | null>(null)

  function restart(): void {
    setSheet(null)
    setTemplateRef(null)
    setStep('import')
  }

  const activeIndex = STEPS.findIndex((s) => s.key === step)

  return (
    <div className="wizard">
      <ol className="step-track">
        {STEPS.map((s, i) => (
          <li key={s.key} className={i === activeIndex ? 'active' : i < activeIndex ? 'done' : ''}>
            <span className="step-index">{i + 1}</span>
            <span className="step-label">{s.label}</span>
          </li>
        ))}
      </ol>

      <div className="wizard-body">
        {step === 'import' && (
          <ImportView
            onImported={(s) => {
              setSheet(s)
              setStep('template')
            }}
            onBack={onExit}
          />
        )}

        {step === 'template' && sheet && (
          <TemplateStepView
            sheet={sheet}
            onNext={(t) => {
              setTemplateRef(t)
              setStep('generate')
            }}
            onBack={() => setStep('import')}
          />
        )}

        {step === 'generate' && sheet && templateRef && (
          <GenerateView
            jobBase={
              {
                sheetId: sheet.id,
                templateRef
              } satisfies Omit<GenerateJobConfig, 'outputDir'>
            }
            onBack={() => setStep('template')}
            onRestart={restart}
          />
        )}
      </div>
    </div>
  )
}
