import {
  ChevronDown,
  ClipboardList,
  Gift,
  LogOut,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { logoutCustomer, useCustomerStore } from "./customerStore";
import { notifyAfterReload } from "./toastStore";
import LogoutConfirmDialog from "./LogoutConfirmDialog";
import "./AccountMenu.css";

// Header account chip once a customer is logged in: an initials avatar
// (first + last letter of their name, e.g. "DM"), their first name and a
// caret. Clicking it opens the account dropdown with their name, email and
// the account options (Log Out included).
function AccountMenu({ onOpenCart }) {
  const { customer } = useCustomerStore();
  const [open, setOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const menuRef = useRef(null);

  // Close the dropdown on outside clicks and Escape.
  useEffect(() => {
    if (!open) return undefined;
    const handlePointer = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!customer) return null;

  const initials = `${customer.firstName.trim()[0] || ""}${
    customer.lastName.trim()[0] || ""
  }`.toUpperCase();

  return (
    <div className="account-menu" ref={menuRef}>
      <button
        type="button"
        className="account-button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="account-avatar">{initials}</span>
        <span className="account-name">{customer.firstName}</span>
        <ChevronDown
          size={15}
          strokeWidth={2.2}
          className={`account-caret${open ? " open" : ""}`}
        />
      </button>

      {open && (
        <div className="account-dropdown" role="menu">
          <div className="account-dropdown-head">
            <p className="account-dropdown-name">
              {customer.firstName} {customer.lastName}
            </p>
            <p className="account-dropdown-email">{customer.email}</p>
          </div>

          <div className="account-dropdown-options">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                window.location.href = "/profile";
              }}
            >
              <UserRound size={15} /> My Profile
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                window.location.href = "/profile?tab=orders";
              }}
            >
              <ClipboardList size={15} /> My Orders
            </button>
            {/* Loyalty Card function arrives later; it opens the profile's
               (currently empty) Loyalty Card section. */}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                window.location.href = "/profile?tab=loyalty";
              }}
            >
              <Gift size={15} /> Loyalty Card
            </button>
            <button
              type="button"
              role="menuitem"
              className="account-dropdown-logout"
              onClick={() => {
                setOpen(false);
                setConfirmLogout(true);
              }}
            >
              <LogOut size={15} /> Log Out
            </button>
          </div>
        </div>
      )}

      {confirmLogout && (
        <LogoutConfirmDialog
          onCancel={() => setConfirmLogout(false)}
          onConfirm={() => {
            logoutCustomer();
            notifyAfterReload("You have been logged out.", "info");
            window.location.href = "/";
          }}
        />
      )}
    </div>
  );
}

export default AccountMenu;

