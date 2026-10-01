import { LogOut, ShieldAlert, X } from "lucide-react";
import { createPortal } from "react-dom";
import "./LogoutConfirmDialog.css";

function LogoutConfirmDialog({
  title = "Log out of your account?",
  message = "You will need to log in again to view your orders, loyalty card, and saved cart.",
  confirmLabel = "Yes, Log Out",
  onCancel,
  onConfirm,
  Icon = ShieldAlert,
}) {
  return createPortal(
    <div
      className="logout-confirm-backdrop"
      role="presentation"
      onClick={onCancel}
    >
      <div
        className="logout-confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-confirm-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="logout-confirm-close"
          onClick={onCancel}
          aria-label="Close logout confirmation"
        >
          <X size={18} />
        </button>
        <span className="logout-confirm-icon">
          <Icon size={25} />
        </span>
        <h2 id="logout-confirm-title">{title}</h2>
        <p>{message}</p>
        <div className="logout-confirm-actions">
          <button
            type="button"
            className="logout-confirm-cancel"
            onClick={onCancel}
          >
            Stay Logged In
          </button>
          <button
            type="button"
            className="logout-confirm-delete"
            onClick={onConfirm}
          >
            <LogOut size={15} /> {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default LogoutConfirmDialog;
