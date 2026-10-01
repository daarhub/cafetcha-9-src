import { Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { authenticateAdmin, createAdminSession } from "./adminManagementStore";
import { notifyAfterReload } from "../Customer/toastStore";
import "./AdminLoginModal.css";

// Admin login modal opened from the footer's "Admin Login" link. Split
// design: brand art on the left, the form on the right. A successful login
// hands control back to the opener (onLoginSuccess) which routes to the
// admin dashboard.
function AdminLoginModal({ onClose, onLoginSuccess }) {
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
      setError("Please enter both the admin email and password.");
      return;
    }

    const result = authenticateAdmin(trimmedEmail, password);
    if (result.ok) {
      setError("");
      createAdminSession(result.profile.email);
      // The opener routes with window.location.assign, which is a full reload.
      // The welcome toast is queued so it survives the navigation and replays
      // once the admin dashboard mounts.
      notifyAfterReload(
        `Welcome back, ${result.profile.name || "Admin"}!`,
        "success",
      );
      onLoginSuccess?.();
    } else {
      setError("Invalid admin email or password.");
    }
  };

  // Rendered through a portal to <body> so the backdrop always covers the
  // whole viewport and stays centered, even from inside the footer.
  return createPortal(
    <div className="admin-login-backdrop" role="presentation" onClick={onClose}>
      <section
        className="admin-login-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-login-title"
        onClick={(event) => event.stopPropagation()}
      >
        {/* TOP RIGHT: close */}
        <button
          type="button"
          className="admin-login-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={22} />
        </button>

        {/* LEFT: brand art */}
        <div className="admin-login-brand">
          <img
            src="/images/logo.png"
            alt="Cafétcha Logo"
            className="admin-login-logo"
          />
          <span className="admin-login-wordmark">Cafétcha</span>
        </div>

        {/* RIGHT: form */}
        <div className="admin-login-panel">
          <form onSubmit={handleSubmit}>
            <span className="admin-login-icon" aria-hidden="true">
              <Users size={58} strokeWidth={2.1} />
            </span>

            <h2 id="admin-login-title">ADMIN LOGIN</h2>

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Admin Email"
              aria-label="Admin Email"
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

            {error && <p className="admin-login-error">{error}</p>}

            <button type="submit" className="admin-login-submit">
              Login
            </button>
          </form>
        </div>
      </section>
    </div>,
    document.body,
  );
}

export default AdminLoginModal;
