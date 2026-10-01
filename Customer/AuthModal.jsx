import { ArrowLeft, CheckCircle2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  loginCustomer,
  registerCustomer,
  requestPasswordReset,
  resetPassword,
  verifyResetCode,
} from "./customerStore";
import { notify } from "./toastStore";
import "./AuthModal.css";

// Six digit-boxes for the verification code. Each cell holds one digit.
// Typing a digit advances focus; Backspace moves back. The code is passed
// to onDone only through the explicit "Verify Code" button (or Enter).
function CodeInput({ value = "", onChange, onKeyDown }) {
  const refs = useRef([]);
  const digits = Array.from({ length: 6 }, (_, index) => value[index] || "");
  const handleChange = (index, event) => {
    const digit = event.target.value.replace(/\D/g, "").slice(-1);
    const next = value.split("");
    next[index] = digit;
    onChange(next.join("").slice(0, 6));
    if (digit && index < 5) refs.current[index + 1]?.focus();
  };
  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus();
    if (event.key === "ArrowRight" && index < 5) {
      refs.current[index + 1]?.focus();
    }
    onKeyDown?.(event);
  };
  return (
    <div className="auth-modal-code-boxes">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            refs.current[index] = element;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(event) => handleChange(index, event)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          aria-label={`Verification code digit ${index + 1}`}
          autoFocus={index === 0}
          className={digit ? "filled" : ""}
        />
      ))}
    </div>
  );
}

// Login / Sign Up modal: brand art on the left, the form on the right.
// Everything that needs an account (header button, guest add-to-cart,
// customizers) opens this modal. The Login tab also hosts the functional
// Forgot Password flow (demo verification codes — a real backend would
// email them). Accounts live in localStorage for now.
function AuthModal({ onClose, onAuthenticated }) {
  // mode: "login" | "signup" | "forgot"
  const [mode, setMode] = useState("login");
  // Forgot-password sub-step: ask-to-send → enter code → new password → done
  const [forgotStep, setForgotStep] = useState("confirm");
  const [sentCode, setSentCode] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    code: "",
    newPassword: "",
    confirmNewPassword: "",
  });

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

  const setField = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError("");
    setNotice("");
  };

  // ----- Forgot password flow -----

  const handleForgotPassword = () => {
    setError("");
    setNotice("");
    setMode("forgot");
    setForgotStep("confirm");
  };

  const handleSendCode = () => {
    setError("");
    if (!form.email.trim()) {
      setError("Enter your email address first.");
      return;
    }
    const result = requestPasswordReset(form.email);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSentCode(result.code);
    setForgotStep("code");
    notify(`Verification code sent to ${form.email.trim()}`, "info");
  };

  // "Send Verification Code" & "Verify Code" & "Change Password" are each
  // inside a <form>, so pressing Enter submits them exactly like Login.
  const handleSendCodeSubmit = (event) => {
    event.preventDefault();
    handleSendCode();
  };

  const handleVerifySubmit = (event) => {
    event.preventDefault();
    handleVerifyCode();
  };

  const handleResetSubmit = (event) => {
    event.preventDefault();
    handleResetPassword();
  };

  const handleVerifyCode = () => {
    setError("");
    const submitted = form.code.trim();
    if (!submitted) {
      setError("Enter the 6-digit verification code we sent you.");
      return;
    }
    if (!verifyResetCode(form.email, submitted)) {
      setError("That verification code is incorrect. Check it and try again.");
      return;
    }
    setForgotStep("reset");
  };

  // Pressing Enter inside the code boxes would normally do nothing (a 6-part
  // input isn't a form field), so let Enter submit the surrounding form too.
  const handleCodeKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleVerifyCode();
    }
  };

  const handleResetPassword = () => {
    setError("");
    if (form.newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (form.newPassword !== form.confirmNewPassword) {
      setError("New passwords do not match.");
      return;
    }
    const result = resetPassword(form.email, form.newPassword);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setForgotStep("done");
    notify("Password changed successfully.");
  };

  const backToLogin = (message) => {
    setMode("login");
    setForgotStep("confirm");
    setError("");
    setNotice(message || "");
    setForm((current) => ({
      ...current,
      password: "",
      code: "",
      newPassword: "",
      confirmNewPassword: "",
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (mode === "login") {
      if (!form.email.trim() || !form.password) {
        setError("Please enter your email address and password.");
        return;
      }
      const result = loginCustomer({
        email: form.email,
        password: form.password,
      });
      if (!result.ok) {
        // A disabled account is reported as a toast, matching the staff and
        // admin panels, instead of inline form text.
        if (result.error === "This customer account is disabled.") {
          notify("This customer account is disabled.", "error");
          return;
        }
        setError(result.error);
        return;
      }
      notify(`Welcome back, ${result.customer.firstName}!`);
      // Callers can continue whatever required the login — e.g. the homepage
      // "Write a Review" flow opens its modal once authentication succeeds.
      onAuthenticated?.(result.customer);
      onClose();
      return;
    }

    // Sign up — the customer must log in with their new account afterwards
    // (signing up never logs them in automatically).
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("Please enter your first and last name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    const result = registerCustomer({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      password: form.password,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    notify("Account created! Please log in.", "info");
    backToLogin("Account created! Please log in with your new account.");
  };

  return createPortal(
    <div className="auth-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="auth-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* LEFT: brand art */}
        <div className="auth-modal-media">
          <img src="/images/center.png" alt="Cafétcha" />
        </div>

        {/* RIGHT: login / sign up / forgot password */}
        <div className="auth-modal-panel">
          {mode === "login" ? (
            <form className="auth-modal-form" onSubmit={handleSubmit}>
              {/* Tabs sit directly above the heading, inside the centered
                  form group — not pinned to the top of the panel. */}
              <div className="auth-modal-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected
                  className="active"
                  onClick={() => switchMode("login")}
                >
                  Login
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={false}
                  onClick={() => switchMode("signup")}
                >
                  Sign Up
                </button>
              </div>
              <h2 id="auth-modal-title">Welcome back!</h2>
              <p className="auth-modal-subtitle">
                Log in with your email address and password.
              </p>
              <label>
                Email Address
                <input
                  type="email"
                  value={form.email}
                  onChange={setField("email")}
                  placeholder="you@email.com"
                  autoComplete="email"
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={form.password}
                  onChange={setField("password")}
                  placeholder="Your password"
                  autoComplete="current-password"
                />
              </label>
              <button
                type="button"
                className="auth-modal-forgot"
                onClick={handleForgotPassword}
              >
                Forgot Password?
              </button>
              {error && <p className="auth-modal-error">{error}</p>}
              {notice && <p className="auth-modal-notice">{notice}</p>}
              <button type="submit" className="auth-modal-submit">
                Log In
              </button>
              <p className="auth-modal-switch">
                New to Cafétcha?{" "}
                <button type="button" onClick={() => switchMode("signup")}>
                  Create an account
                </button>
              </p>
            </form>
          ) : mode === "signup" ? (
            <form className="auth-modal-form" onSubmit={handleSubmit}>
              <div className="auth-modal-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={false}
                  onClick={() => switchMode("login")}
                >
                  Login
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected
                  className="active"
                  onClick={() => switchMode("signup")}
                >
                  Sign Up
                </button>
              </div>
              <h2 id="auth-modal-title">Create your account</h2>
              <p className="auth-modal-subtitle">
                Sign up to add items to your cart and save your custom builds.
              </p>
              <div className="auth-modal-row">
                <label>
                  First Name
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={setField("firstName")}
                    placeholder="Juan"
                    autoComplete="given-name"
                  />
                </label>
                <label>
                  Last Name
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={setField("lastName")}
                    placeholder="Dela Cruz"
                    autoComplete="family-name"
                  />
                </label>
              </div>
              <label>
                Email Address
                <input
                  type="email"
                  value={form.email}
                  onChange={setField("email")}
                  placeholder="you@email.com"
                  autoComplete="email"
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={form.password}
                  onChange={setField("password")}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                />
              </label>
              <label>
                Confirm Password
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={setField("confirmPassword")}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                />
              </label>
              {error && <p className="auth-modal-error">{error}</p>}
              <button type="submit" className="auth-modal-submit">
                Sign Up
              </button>
              <p className="auth-modal-switch">
                Already have an account?{" "}
                <button type="button" onClick={() => switchMode("login")}>
                  Log in instead
                </button>
              </p>
            </form>
          ) : (
            <div className="auth-modal-forgot-flow">
              {forgotStep !== "done" && (
                <button
                  type="button"
                  className="auth-modal-back"
                  onClick={() => backToLogin("")}
                >
                  <ArrowLeft size={14} /> Back to Login
                </button>
              )}

              {forgotStep === "confirm" && (
                <form onSubmit={handleSendCodeSubmit}>
                  <h2 id="auth-modal-title">Forgot Password?</h2>
                  <p className="auth-modal-subtitle">
                    Enter the email address you registered with and we'll send
                    a 6-digit verification code to it.
                  </p>
                  <label>
                    Email Address
                    <input
                      type="email"
                      value={form.email}
                      onChange={setField("email")}
                      placeholder="you@email.com"
                      autoComplete="email"
                    />
                  </label>
                  {error && <p className="auth-modal-error">{error}</p>}
                  <button type="submit" className="auth-modal-submit">
                    Send Verification Code
                  </button>
                </form>
              )}

              {forgotStep === "code" && (
                <form onSubmit={handleVerifySubmit}>
                  <h2 id="auth-modal-title">Check your email</h2>
                  <p className="auth-modal-subtitle">
                    We sent a 6-digit verification code to{" "}
                    <strong>{form.email.trim()}</strong>. Enter it below to
                    continue.
                  </p>
                  <div className="auth-modal-demo-mail">
                    <strong>Demo email</strong>
                    <span>
                      Your verification code: <b>{sentCode}</b>
                    </span>
                  </div>
                  <label className="auth-modal-code-label">
                    Verification Code
                    <CodeInput
                      value={form.code}
                      onChange={(value) =>
                        setForm((current) => ({ ...current, code: value }))
                      }
                      onKeyDown={handleCodeKeyDown}
                    />
                  </label>
                  {error && <p className="auth-modal-error">{error}</p>}
                  <button type="submit" className="auth-modal-submit">
                    Verify Code
                  </button>
                  <p className="auth-modal-switch">
                    Didn't get it?{" "}
                    <button type="button" onClick={handleSendCode}>
                      Resend code
                    </button>
                  </p>
                </form>
              )}

              {forgotStep === "reset" && (
                <form onSubmit={handleResetSubmit}>
                  <h2 id="auth-modal-title">Set a new password</h2>
                  <p className="auth-modal-subtitle">
                    Code verified — choose a new password for{" "}
                    <strong>{form.email.trim()}</strong>.
                  </p>
                  <label>
                    New Password
                    <input
                      type="password"
                      value={form.newPassword}
                      onChange={setField("newPassword")}
                      placeholder="At least 6 characters"
                      autoComplete="new-password"
                    />
                  </label>
                  <label>
                    Confirm New Password
                    <input
                      type="password"
                      value={form.confirmNewPassword}
                      onChange={setField("confirmNewPassword")}
                      placeholder="Re-enter your new password"
                      autoComplete="new-password"
                    />
                  </label>
                  {error && <p className="auth-modal-error">{error}</p>}
                  <button type="submit" className="auth-modal-submit">
                    Change Password
                  </button>
                </form>
              )}

              {forgotStep === "done" && (
                <div className="auth-modal-done">
                  <CheckCircle2 size={46} strokeWidth={1.6} />
                  <h2 id="auth-modal-title">Password changed!</h2>
                  <p className="auth-modal-subtitle">
                    Your password has been changed successfully. Log in with
                    your new password.
                  </p>
                  <button
                    type="button"
                    className="auth-modal-submit"
                    onClick={() =>
                      backToLogin(
                        "Password changed successfully. Log in with your new password.",
                      )
                    }
                  >
                    Back to Login
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}

export default AuthModal;