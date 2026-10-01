import { CheckCircle2, ShieldAlert, X } from "lucide-react";

function StaffConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  variant = "danger",
  onCancel,
  onConfirm,
}) {
  const isSuccess = variant === "success";
  const Icon = isSuccess ? CheckCircle2 : ShieldAlert;

  return (
    <div className="staff-confirm-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="staff-confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-confirm-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="staff-confirm-close"
          onClick={onCancel}
          aria-label="Close confirmation"
        >
          <X size={18} />
        </button>
        <span className={`staff-confirm-icon${isSuccess ? " success" : ""}`}>
          <Icon size={25} />
        </span>
        <h2 id="staff-confirm-title">{title}</h2>
        <p>{message}</p>
        <div className="staff-confirm-actions">
          <button
            type="button"
            className="staff-confirm-cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`staff-confirm-delete${
              isSuccess ? " staff-confirm-success" : ""
            }`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default StaffConfirmDialog;

