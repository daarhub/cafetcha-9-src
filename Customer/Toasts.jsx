import { CheckCircle2, Info, XCircle } from "lucide-react";
import { createPortal } from "react-dom";
import { useToasts } from "./toastStore";
import "./Toasts.css";

const ICONS = { success: CheckCircle2, error: XCircle, info: Info };

// Stack of transaction notifications, rendered through a portal so it floats
// above every page and modal. Staff pages pass variant="staff" to place the
// stack above the staff content without the customer header offset.
function Toasts({ variant = "default" }) {
  const toasts = useToasts();
  if (!toasts.length) return null;

  return createPortal(
    <div className={`toast-stack toast-stack-${variant}`} aria-live="polite">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type] || CheckCircle2;
        return (
          <div className={`toast toast-${toast.type}`} key={toast.id}>
            <span className="toast-icon">
              <Icon size={18} strokeWidth={2.2} />
            </span>
            <span>{toast.message}</span>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}

export default Toasts;