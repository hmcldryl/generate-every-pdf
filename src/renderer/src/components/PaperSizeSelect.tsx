import type { PaperSize } from '@shared/types'

interface Props {
  value: PaperSize
  onChange: (size: PaperSize) => void
}

const STANDARD_PAPER_SIZES: Exclude<PaperSize, { width: string; height: string }>[] = [
  'A4',
  'A3',
  'A5',
  'A6',
  'Letter',
  'Legal',
  'Tabloid',
  'Ledger'
]

function isCustomPaperSize(size: PaperSize): size is { width: string; height: string } {
  return typeof size !== 'string'
}

export default function PaperSizeSelect({ value, onChange }: Props): JSX.Element {
  return (
    <>
      <select
        value={isCustomPaperSize(value) ? 'custom' : value}
        onChange={(e) =>
          onChange(e.target.value === 'custom' ? { width: '8.5in', height: '11in' } : (e.target.value as PaperSize))
        }
      >
        {STANDARD_PAPER_SIZES.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
        <option value="custom">Custom…</option>
      </select>
      {isCustomPaperSize(value) && (
        <>
          <input
            placeholder="width, e.g. 8.5in"
            value={value.width}
            onChange={(e) => onChange({ ...value, width: e.target.value })}
          />
          <input
            placeholder="height, e.g. 11in"
            value={value.height}
            onChange={(e) => onChange({ ...value, height: e.target.value })}
          />
        </>
      )}
    </>
  )
}
