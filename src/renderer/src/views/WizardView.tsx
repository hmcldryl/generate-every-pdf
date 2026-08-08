import { useState } from 'react'
import type { FieldMapping, GenerateJobConfig, ImportedSheet, TemplateRef } from '@shared/types'
import ImportView from './ImportView'
import TemplateSelectView from './TemplateSelectView'
import MappingView from './MappingView'
import GenerateView from './GenerateView'

type Step = 'import' | 'template' | 'mapping' | 'generate'

const STEPS: { key: Step; label: string }[] = [
  { key: 'import', label: 'Import sheet' },
  { key: 'template', label: 'Template' },
  { key: 'mapping', label: 'Mapping' },
  { key: 'generate', label: 'Generate' }
]

interface Props {
  onExit: () => void
}

export default function WizardView({ onExit }: Props): JSX.Element {
  const [step, setStep] = useState<Step>('import')
  const [sheet, setSheet] = useState<ImportedSheet | null>(null)
  const [templateRef, setTemplateRef] = useState<TemplateRef | null>(null)
  const [mapping, setMapping] = useState<FieldMapping | null>(null)

  function restart(): void {
    setSheet(null)
    setTemplateRef(null)
    setMapping(null)
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

        {step === 'template' && (
          <TemplateSelectView
            onSelect={(t) => {
              setTemplateRef(t)
              setStep('mapping')
            }}
            onBack={() => setStep('import')}
          />
        )}

        {step === 'mapping' && sheet && templateRef && (
          <MappingView
            sheet={sheet}
            templateRef={templateRef}
            onNext={(m) => {
              setMapping(m)
              setStep('generate')
            }}
            onBack={() => setStep('template')}
          />
        )}

        {step === 'generate' && sheet && templateRef && mapping && (
          <GenerateView
            jobBase={
              {
                sheetId: sheet.id,
                templateRef,
                mapping
              } satisfies Omit<GenerateJobConfig, 'outputDir'>
            }
            onBack={() => setStep('mapping')}
            onRestart={restart}
          />
        )}
      </div>

      <button className="wizard-exit" onClick={onExit}>
        ← Exit to dashboard
      </button>
    </div>
  )
}
