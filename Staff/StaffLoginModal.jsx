import { UserCog, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { loginStaff } from "../Admin/adminManagementStore";
import { notify, notifyAfterReload } from "../Customer/toastStore";
import "./StaffLoginModal.css";

// Staff credentials are managed by the admin Staff Management page.
// Only active accounts whose role is exactly Staff can sign in.

// Staff login modal opened from the footer's "Staff Login" link. Split
// design: brand art on the left, the form on the right — the same brown
// palette as the admin login, but without a Forgot Password option (staff
// credentials are handled by the head administrator). A successful login
// hands control back to the opener (onLoginSuccess) which routes to the
// staff dashboard.
function StaffLoginModal({ onClose, onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Close on Escape and lock page scrolling while the modal is open.
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      setError("Please enter both the staff email and password.");
      return;
    }

    const result = loginStaff({ email: trimmedEmail, password });
    if (result.ok) {
      setError("");
      notifyAfterReload(`Welcome to the Staff Panel, ${result.member.name}!`, "success");
      onLoginSuccess?.(result.member);
    } else if (result.error === "This staff account is disabled.") {
      // A disabled account is a normal outcome, not a form error — surface it
      // as a toast instead of inline text inside the modal.
      notify("This staff account is disabled.", "error");
    } else {
      setError(result.error);
    }
  };

  // Rendered through a portal to <body> so the backdrop always covers the
  // whole viewport and stays centered, even from inside the footer.
  return createPortal(
    <div className="staff-login-backdrop" role="presentation" onClick={onClose}>
      <section
        className="staff-login-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-login-title"
        onClick={(event) => event.stopPropagation()}
      >
        {/* TOP RIGHT: close */}
        <button
          type="button"
          className="staff-login-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={22} />
        </button>

        {/* LEFT: brand art */}
        <div className="staff-login-brand">
          <img
            src="/images/logo.png"
            alt="Cafétcha Logo"
            className="staff-login-logo"
          />
          <span className="staff-login-wordmark">Cafétcha</span>
        </div>

        {/* RIGHT: form */}
        <div className="staff-login-panel">
          <form onSubmit={handleSubmit}>
            <span className="staff-login-icon" aria-hidden="true">
              <UserCog size={58} strokeWidth={2.1} />
            </span>

            <h2 id="staff-login-title">STAFF LOGIN</h2>

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Staff Email"
              aria-label="Staff Email"
              autoComplete="email"
            />

            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              aria-label="Password"
              autoComplete="current-password"
            />

            {error && <p className="staff-login-error">{error}</p>}

            <button type="submit" className="staff-login-submit">
              Login
            </button>
          </form>
        </div>
      </section>
    </div>,
    document.body,
  );
}

export default StaffLoginModal;