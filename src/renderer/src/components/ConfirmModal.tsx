interface Props {
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  busy?: boolean
  error?: string | null
  onConfirm: () => void
  onCancel: () => void
}

// Generic yes/no modal for actions worth a pause first — irreversible
// deletes, mainly. Pairs with the .modal styles shared with AboutModal.
export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirm',
  danger,
  busy,
  error,
  onConfirm,
  onCancel
}: Props): JSX.Element {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{title}</h2>
        <p>{message}</p>
        {error && <p className="error">{error}</p>}
        <div className="modal-actions">
          <button onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className={danger ? 'danger' : 'cta'} onClick={onConfirm} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
