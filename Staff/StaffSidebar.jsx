import {
  ClipboardList,
  History,
  House,
  LogOut,
  UsersRound,
  Utensils,
} from "lucide-react";
import { useEffect, useState } from "react";
import Toasts from "../Customer/Toasts";
import { notifyAfterReload } from "../Customer/toastStore";
import { logoutCustomer } from "../Customer/customerStore";

import { logoutStaff, getCurrentStaff, useAdminManagement } from "../Admin/adminManagementStore";
import LogoutConfirmDialog from "../Customer/LogoutConfirmDialog";
import "./StaffSidebar.css";

// Staff destinations. Menu availability is managed locally and is shared
// with the guest/customer menu on this device.
const STAFF_NAV_ITEMS = [
  { label: "Home", icon: House, href: "/staff", exact: true },
  { label: "Orders", icon: ClipboardList, href: "/staff/orders" },
  { label: "Menu items", icon: Utensils, href: "/staff/menu-items" },
  { label: "Customer Management", icon: UsersRound, href: "/staff/customers" },
  { label: "Order History", icon: History, href: "/staff/history" },
];

// Reusable staff sidebar — every staff page renders <StaffSidebar /> so the
// navigation looks and behaves the same everywhere (like the guest Footer
// and the AdminSidebar). The active item follows the current path: Home only
// lights up on the dashboard itself, and each section lights up on its own
// routes. Logout stays pinned at the bottom, apart from the sections.
function StaffSidebar() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  const [confirmLogout, setConfirmLogout] = useState(false);
  useAdminManagement();
  const currentStaff = getCurrentStaff();
  const currentStaffId = currentStaff?.id;

  useEffect(() => {
    if (!currentStaffId) window.location.assign("/");
  }, [currentStaffId]);

  const isActive = (item) =>
    item.exact
      ? path === item.href
      : path === item.href || path.startsWith(`${item.href}/`);

  const renderNavItem = (item) => {
    const Icon = item.icon;

    return (
      <a
        key={item.label}
        href={item.href}
        className={`staff-nav-item${isActive(item) ? " active" : ""}`}
      >
        <Icon size={20} strokeWidth={2} />
        <span className="staff-nav-label">{item.label}</span>
      </a>
    );
  };

  // Staff Panel access is represented only by the shared staff session. Logging
  // out clears that session and never touches the customer's separate session.
  const handleLogout = () => {
    setConfirmLogout(true);
  };

  return (
    <aside className="staff-sidebar">
      {/* Brand — logo, name, and the Staff Panel title */}
      <a href="/staff" className="staff-sidebar-brand">
        <img
          src={currentStaff?.image || "/images/logo.png"}
          alt={currentStaff?.name || "Cafétcha Staff Panel"}
          className="staff-sidebar-logo"
        />
        <span className="staff-sidebar-brand-text">
          <span className="staff-sidebar-name">Cafétcha</span>
          <span className="staff-sidebar-subtitle">Staff Panel</span>
        </span>
      </a>

      <nav className="staff-sidebar-nav" aria-label="Staff Panel">
        {STAFF_NAV_ITEMS.map(renderNavItem)}
      </nav>

      <div className="staff-sidebar-footer">
        <button
          type="button"
          className="staff-nav-item staff-logout"
          onClick={handleLogout}
        >
          <LogOut size={20} strokeWidth={2} />
          <span className="staff-nav-label">Logout</span>
        </button>
      </div>
      <Toasts variant="staff" />
      {confirmLogout && (
        <LogoutConfirmDialog
          title="Log out of the Staff Panel?"
          message="You will be returned to the Cafétcha home page."
          icon={LogOut}
          onCancel={() => setConfirmLogout(false)}
          onConfirm={() => {
            logoutStaff();
            logoutCustomer();
            notifyAfterReload("You have been logged out of the Staff Panel.", "info");
            window.location.assign("/");
          }}
        />
      )}
    </aside>
  );
}

export default StaffSidebar;