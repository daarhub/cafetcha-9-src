import {
  ChartColumn,
  House,
  LogOut,
  MessageSquare,
  Settings,
  Star,
  Utensils,
  Users,
  UsersRound,
} from "lucide-react";
import Toasts from "../Customer/Toasts";
import {
  getContactMessages,
  logoutCustomer,
  useCustomerStore,
} from "../Customer/customerStore";
import { useReviews } from "./Reviews/ReviewsStore";
import AdminConfirmDialog from "./AdminConfirmDialog";
import { notifyAfterReload } from "../Customer/toastStore";
import {
  destroyAdminSession,
  getAdminProfile,
} from "./adminManagementStore";
import { useState } from "react";
import "./AdminSidebar.css";

// Admin destinations. Menu management owns regular items, promos, new
// arrivals, and customizer cards. Analytics, staff, and customers use the
// real local stores below.
const ADMIN_NAV_ITEMS = [
  { label: "Home", icon: House, href: "/admin", exact: true },
  { label: "Menu Management", icon: Utensils, href: "/admin/menu-management" },
  { label: "Analytics", icon: ChartColumn, href: "/admin/analytics" },
  { label: "Staff Management", icon: Users, href: "/admin/staff" },
  { label: "Customer Management", icon: UsersRound, href: "/admin/customers" },
  { label: "Messages", icon: MessageSquare, href: "/admin/messages" },
  { label: "Reviews", icon: Star, href: "/admin/reviews" },
  { label: "Settings", icon: Settings, href: "/admin/settings" },
];

// Reusable admin sidebar — every admin page renders <AdminSidebar /> so the
// navigation looks and behaves the same everywhere (like the guest Footer).
// The active item follows the current path: Home only lights up on the
// dashboard itself, and each section lights up on its own routes.
function AdminSidebar() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  const [confirmLogout, setConfirmLogout] = useState(false);
  const adminProfile = getAdminProfile();
  useCustomerStore();
  const reviews = useReviews();
  const unreadMessages = getContactMessages().filter((message) => !message.read).length;
  const newReviews = reviews.filter((review) => review.adminRead === false).length;

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
        className={`admin-nav-item${isActive(item) ? " active" : ""}`}
      >
        <Icon size={20} strokeWidth={2} />
        <span className="admin-nav-label">{item.label}</span>
        {((item.label === "Messages" && unreadMessages > 0) ||
          (item.label === "Reviews" && newReviews > 0)) && (
          <span className="admin-nav-new-dot" aria-label="New items" />
        )}
      </a>
    );
  };

  return (
    <aside className="admin-sidebar">
      {/* Brand — logo, name, and the Admin Panel title */}
      <a href="/admin" className="admin-sidebar-brand">
        <img
          src={adminProfile.image}
          alt={adminProfile.name}
          className="admin-sidebar-logo admin-sidebar-darwin-logo"
          title={`${adminProfile.name} — Admin Panel owner`}
        />
        <span className="admin-sidebar-brand-text">
          <span className="admin-sidebar-name">Cafétcha</span>
          <span className="admin-sidebar-subtitle">Admin Panel</span>
        </span>
      </a>

      <nav className="admin-sidebar-nav" aria-label="Admin Panel">
        {ADMIN_NAV_ITEMS.map(renderNavItem)}
      </nav>

      {/* Admin Account stays pinned at the bottom, apart from the sections */}
      <div className="admin-sidebar-footer">
        <button
          type="button"
          className="admin-nav-item admin-logout"
          onClick={() => setConfirmLogout(true)}
        >
          <LogOut size={20} strokeWidth={2} />
          <span className="admin-nav-label">Logout</span>
        </button>
      </div>
      <Toasts variant="admin" />
      {confirmLogout && (
        <AdminConfirmDialog
          title="Log out of the Admin Panel?"
          message="You will be returned to the Cafétcha home page. Your admin session will be cleared."
          confirmLabel="Yes, Log Out"
          icon={LogOut}
          onCancel={() => setConfirmLogout(false)}
          onConfirm={() => {
            destroyAdminSession();
            logoutCustomer();
            notifyAfterReload("You have been logged out of the Admin Panel.", "info");
            window.location.assign("/");
          }}
        />
      )}
    </aside>
  );
}

export default AdminSidebar;