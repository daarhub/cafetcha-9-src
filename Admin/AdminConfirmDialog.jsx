import { CheckCircle2, ShieldAlert, X } from "lucide-react";
import { createPortal } from "react-dom";

function AdminConfirmDialog({
  title,
  message,
  confirmLabel = "Yes, continue",
  variant = "danger",
  icon: Icon,
  onCancel,
  onConfirm,
}) {
  const success = variant === "success";
  const WarningIcon = Icon || (success ? CheckCircle2 : ShieldAlert);
  return createPortal(
    <div className="admin-modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="admin-confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="admin-confirm-close"
          onClick={onCancel}
          aria-label="Close confirmation"
        >
          <X size={18} />
        </button>
        <span className={`admin-confirm-icon ${success ? "success" : ""}`}>
          <WarningIcon size={28} />
        </span>
        <h2 id="admin-confirm-title">{title}</h2>
        <p>{message}</p>
        <div>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={success ? "admin-confirm-success" : "danger"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default AdminConfirmDialog;
