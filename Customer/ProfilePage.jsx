import {
  Clock,
  ClipboardList,
  Coffee,
  Gift,
  History,
  LayoutDashboard,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Header from "../HomepageGuest/Header";
import Footer from "../HomepageGuest/Footer";
import AuthModal from "./AuthModal";
import { BARANGAYS } from "./deliveryConfig";
import { getAllReviews } from "../Admin/Reviews/ReviewsStore";
import {
  cancelCustomerOrder,
  cancelRedemptionOrder,
  changeCustomerPassword,
  claimLoyaltyReward,
  deleteCustomerAccount,
  deleteCustomerAddress,
  deleteCustomerOrder,
  deleteRedemptionOrder,
  getCustomerOrders,
  getLoyaltyCard,
  getRedemptionOrders,
  LOYALTY_WINDOW_MS,
  notifyUiRefresh,
  saveCustomerAddress,
  setDefaultCustomerAddress,
  updateCustomerProfile,
  useCustomerStore,
} from "./customerStore";
import { notify } from "./toastStore";
import "./ProfilePage.css";

// Status badge colors. Delivery: Pending → Preparing → Out for Delivery →
// Completed. Walk-in: Pending → Preparing → Ready to Claim → Completed.
// The staff side advances the statuses; the customer can cancel a Pending
// order and delete Cancelled / Completed ones.
const STATUS_STYLES = {
  Pending: "#b45309",
  Preparing: "#f97316",
  "Out for Delivery": "#2563eb",
  "Ready to Claim": "#2563eb",
  Completed: "#2e8b57",
  Cancelled: "#b3261e",
};

const EMPTY_ADDRESS = {
  id: null,
  fullName: "",
  phone: "",
  barangay: "",
  street: "",
  isDefault: false,
};

// Sidebar navigation. ?tab=orders (the header's "Order History" link) lands
// on the history entry; ?tab=loyalty lands on the loyalty card.
const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "orders", label: "My Orders", icon: ClipboardList },
  { id: "addresses", label: "My Addresses", icon: MapPin },
  { id: "loyalty", label: "Loyalty Card", icon: Gift },
  { id: "history", label: "Order History", icon: History },
  { id: "security", label: "Profile & Security", icon: ShieldCheck },
];

const initialTab = () => {
  const requested = new URLSearchParams(window.location.search).get("tab");
  if (requested === "loyalty") return "loyalty";
  if (requested === "orders") return "orders";
  if (requested === "history") return "history";
  if (requested === "addresses") return "addresses";
  if (requested === "security") return "security";
  return "overview";
};

// My Profile (/profile) — the customer dashboard. The green hero keeps the
// design language of the other pages; below it, a left sidebar navigates
// between Overview (stats + account info), My Orders, My Addresses, the
// Loyalty Card, Order History and Profile & Security.
function ProfilePage() {
  const { customer } = useCustomerStore();
  const [authOpen, setAuthOpen] = useState(false);
  const [tab, setTab] = useState(initialTab);
  const orders = getCustomerOrders();

  // Switching sidebar tabs rewrites ?tab= in the URL and asks subscribers to
  // refresh, so the header's active line follows the visible section (the
  // Loyalty Card line only shows while the Loyalty Card section is open).
  const changeTab = (id) => {
    setTab(id);
    window.history.replaceState(
      null,
      "",
      id === "overview" ? "/profile" : `/profile?tab=${id}`,
    );
    notifyUiRefresh();
  };

  if (!customer) {
    return (
      <>
        <Header />
        <main className="profile-page">
          <section className="profile-hero">
            <p className="profile-crumb">Home / My Profile</p>
            <h1>MY PROFILE</h1>
            <p>Log in to manage your account, addresses and orders.</p>
          </section>
          <section className="profile-body">
            <div className="profile-gate">
              <UserRound size={42} strokeWidth={1.5} />
              <h2>Log in to view your profile</h2>
              <p>Your dashboard is saved per account on this device.</p>
              <button type="button" onClick={() => setAuthOpen(true)}>
                Login / Sign Up
              </button>
            </div>
          </section>
          <Footer />
          {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
        </main>
      </>
    );
  }

  const activeStatuses = [
    "Pending",
    "Preparing",
    "Out for Delivery",
    "Ready to Claim",
  ];
  const completedCount = orders.filter(
    (order) => order.status === "Completed",
  ).length;
  const reviewedProducts = new Set(
    getAllReviews()
      .filter((review) => review.customerId === customer.id)
      .map((review) => review.productId),
  ).size;
  const loyaltyCard = getLoyaltyCard();
  const stats = [
    {
      label: "Active Orders",
      value: orders.filter((order) => activeStatuses.includes(order.status))
        .length,
    },
    { label: "Completed", value: completedCount },
    { label: "Rated Products", value: reviewedProducts },
    {
      label: "Loyalty Card Stamp",
      value: `${loyaltyCard?.stamps ?? 0}/6`,
    },
  ];

  const initials = `${customer.firstName.trim()[0] || ""}${
    customer.lastName.trim()[0] || ""
  }`.toUpperCase();

  return (
    <>
      <Header />
      <main className="profile-page">
        <section className="profile-hero">
          <p className="profile-crumb">Home / My Profile</p>
          <h1>MY PROFILE</h1>
          <p>
            Hello, {customer.firstName}! Manage your account details, delivery
            addresses and orders here.
          </p>
        </section>

        <section className="profile-body">
          <div className="profile-layout">
            {/* Left sidebar */}
            <aside className="profile-sidebar">
              <div className="profile-sidebar-card">
                <span className="profile-avatar">{initials}</span>
                <p className="profile-sidebar-name">
                  {customer.firstName} {customer.lastName}
                </p>
                <p className="profile-sidebar-email">{customer.email}</p>
              </div>
              <nav className="profile-nav" role="tablist">
                {TABS.map((entry) => {
                  const Icon = entry.icon;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      role="tab"
                      aria-selected={tab === entry.id}
                      className={tab === entry.id ? "active" : ""}
                      onClick={() => changeTab(entry.id)}
                    >
                      <Icon size={16} strokeWidth={1.9} />
                      {entry.label}
                    </button>
                  );
                })}
              </nav>
            </aside>

            {/* Active section */}
            <div className="profile-content">
              {tab === "overview" && (
                <OverviewSection
                  customer={customer}
                  stats={stats}
                  onGoOrders={() => changeTab("orders")}
                />
              )}
              {tab === "orders" && (
                <OrdersSection
                  orders={orders}
                  rewardOrders={getRedemptionOrders()}
                  focusedOrderId={
                    new URLSearchParams(window.location.search).get("order")
                  }
                />
              )}
              {tab === "addresses" && <AddressesSection customer={customer} />}
              {tab === "loyalty" && <LoyaltySection customer={customer} />}
              {tab === "history" && <HistorySection orders={orders} />}
              {tab === "security" && <SecuritySection customer={customer} />}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

/* ---------------- Overview tab ---------------- */
// Stats strip (Active Orders, Completed, Rated Products, Loyalty Card Stamp)
function OverviewSection({ customer, stats, onGoOrders }) {
  const initials = `${customer.firstName.trim()[0] || ""}${
    customer.lastName.trim()[0] || ""
  }`.toUpperCase();

  return (
    <>
      <div className="profile-stats">
        {stats.map((stat) => (
          <div className="profile-stat" key={stat.label}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </div>

      <div className="profile-card">
        <h3>Account Information</h3>
        <div className="profile-identity">
          <span className="profile-avatar large">{initials}</span>
          <div>
            <p className="profile-identity-name">
              {customer.firstName} {customer.lastName}
            </p>
            <p className="profile-identity-sub">
              Cafétcha member since{" "}
              {new Date(customer.createdAt || Date.now()).toLocaleDateString()}
            </p>
          </div>
        </div>
        <ul className="profile-facts">
          <li>
            <span>First Name</span>
            <strong>{customer.firstName}</strong>
          </li>
          <li>
            <span>Last Name</span>
            <strong>{customer.lastName}</strong>
          </li>
          <li>
            <span>Email Address</span>
            <strong>{customer.email}</strong>
          </li>
          <li>
            <span>Member Since</span>
            <strong>
              {new Date(customer.createdAt || Date.now()).toLocaleDateString()}
            </strong>
          </li>
          <li>
            <span>Saved Addresses</span>
            <strong>{(customer.addresses || []).length}</strong>
          </li>
        </ul>
        <button
          type="button"
          className="profile-primary-btn profile-overview-cta"
          onClick={onGoOrders}
        >
          <ClipboardList size={14} /> View My Orders
        </button>
      </div>
    </>
  );
}

/* ---------------- Profile & Security tab ---------------- */
function SecuritySection({ customer }) {
  const [profile, setProfile] = useState({
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
  });
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [profileMsg, setProfileMsg] = useState(null);
  const [pwdMsg, setPwdMsg] = useState(null);
  // "Save Changes" first opens this modal — the profile is only saved after
  // the current password is confirmed inside it.
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [savePwd, setSavePwd] = useState("");
  const [saveError, setSaveError] = useState("");
  const [dangerOpen, setDangerOpen] = useState(false);
  const [dangerPassword, setDangerPassword] = useState("");
  const [dangerError, setDangerError] = useState("");
  // "Update Password" only validates the form; this flag opens the
  // confirmation dialog, and the password only changes from inside it.
  const [pwdConfirmOpen, setPwdConfirmOpen] = useState(false);
  const [pwdConfirmError, setPwdConfirmError] = useState("");

  // The first click only validates the form and opens the password modal —
  // nothing is saved until the password has been confirmed.
  const handleProfileSave = (event) => {
    event.preventDefault();
    if (!profile.firstName.trim() || !profile.lastName.trim()) {
      setProfileMsg({
        ok: false,
        text: "Please enter your first and last name.",
      });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())) {
      setProfileMsg({ ok: false, text: "Please enter a valid email address." });
      return;
    }
    setSavePwd("");
    setSaveError("");
    setSaveModalOpen(true);
  };

  // The actual save — runs from the password confirmation modal.
  const handleConfirmedSave = (event) => {
    event.preventDefault();
    if (!savePwd) {
      setSaveError("Please enter your current password to save changes.");
      return;
    }
    const result = updateCustomerProfile({
      ...profile,
      password: savePwd,
    });
    if (!result.ok) {
      setSaveError(result.error);
      return;
    }
    setSaveModalOpen(false);
    setProfileMsg({
      ok: true,
      text: "Account information updated successfully.",
    });
    notify("Account information updated.", "success");
  };

  // The first click only validates the form and opens the confirmation
  // dialog — nothing is changed until the customer confirms inside it.
  const handlePasswordSave = (event) => {
    event.preventDefault();
    if (pwd.next !== pwd.confirm) {
      setPwdMsg({ ok: false, text: "New passwords do not match." });
      return;
    }
    if (!pwd.current) {
      setPwdMsg({
        ok: false,
        text: "Please enter your current password.",
      });
      return;
    }
    setPwdConfirmError("");
    setPwdConfirmOpen(true);
  };

  // The actual password change — runs from the confirmation dialog.
  const handleConfirmedPasswordSave = (event) => {
    event.preventDefault();
    const result = changeCustomerPassword(pwd.current, pwd.next);
    if (!result.ok) {
      setPwdConfirmError(result.error);
      setPwdMsg({ ok: false, text: result.error });
      return;
    }
    setPwdConfirmOpen(false);
    setPwdMsg({ ok: true, text: "Password changed successfully." });
    setPwd({ current: "", next: "", confirm: "" });
    notify("Password changed.", "success");
  };

  const handleDeleteAccount = (event) => {
    event.preventDefault();
    setDangerError("");
    const result = deleteCustomerAccount(dangerPassword);
    if (!result.ok) {
      setDangerError(result.error);
      return;
    }
    notify("Your account has been deleted.", "info");
    window.location.href = "/";
  };

  return (
    <>
      <form className="profile-card" onSubmit={handleProfileSave}>
        <h3>Account Information</h3>
        {profileMsg && (
          <p className={profileMsg.ok ? "profile-msg ok" : "profile-msg error"}>
            {profileMsg.text}
          </p>
        )}
        <div className="profile-grid-2">
          <label>
            First Name
            <input
              type="text"
              value={profile.firstName}
              onChange={(e) =>
                setProfile({ ...profile, firstName: e.target.value })
              }
            />
          </label>
          <label>
            Last Name
            <input
              type="text"
              value={profile.lastName}
              onChange={(e) =>
                setProfile({ ...profile, lastName: e.target.value })
              }
            />
          </label>
        </div>
        <label>
          Email Address
          <input
            type="email"
            value={profile.email}
            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
          />
        </label>
        <button type="submit" className="profile-primary-btn">
          Save Changes
        </button>
      </form>

      <form className="profile-card" onSubmit={handlePasswordSave}>
        <h3>Change Password</h3>
        {pwdMsg && (
          <p className={pwdMsg.ok ? "profile-msg ok" : "profile-msg error"}>
            {pwdMsg.text}
          </p>
        )}
        <label>
          Current Password
          <input
            type="password"
            value={pwd.current}
            onChange={(e) => setPwd({ ...pwd, current: e.target.value })}
            autoComplete="current-password"
          />
        </label>
        <label>
          New Password
          <input
            type="password"
            value={pwd.next}
            onChange={(e) => setPwd({ ...pwd, next: e.target.value })}
            autoComplete="new-password"
          />
        </label>
        <label>
          Confirm New Password
          <input
            type="password"
            value={pwd.confirm}
            onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })}
            autoComplete="new-password"
          />
        </label>
        <button type="submit" className="profile-primary-btn">
          Update Password
        </button>
      </form>

      <div className="profile-card profile-danger">
        <h3>Danger Zone</h3>
        <p className="profile-danger-text">
          Permanently delete your account, saved cart, addresses and order
          history. This cannot be undone.
        </p>
        <button
          type="button"
          className="profile-danger-btn"
          onClick={() => {
            setDangerOpen(true);
            setDangerError("");
            setDangerPassword("");
          }}
        >
          <Trash2 size={14} /> Delete Account
        </button>
      </div>

      {/* Save-changes password confirmation — opens after "Save Changes",
          portaled so it centers on the viewport. */}
      {saveModalOpen &&
        createPortal(
          <div
            className="profile-confirm-backdrop"
            role="presentation"
            onClick={() => setSaveModalOpen(false)}
          >
            <form
              className="profile-confirm-modal"
              role="dialog"
              aria-modal="true"
              onSubmit={handleConfirmedSave}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="profile-confirm-close"
                aria-label="Close"
                onClick={() => setSaveModalOpen(false)}
              >
                <X size={18} />
              </button>
              <h3>Confirm your password</h3>
              <p className="profile-confirm-text">
                To save your account information, please enter your current
                password.
              </p>
              <label>
                Current Password
                <input
                  type="password"
                  value={savePwd}
                  onChange={(e) => setSavePwd(e.target.value)}
                  autoComplete="current-password"
                />
              </label>
              {saveError && <p className="profile-msg error">{saveError}</p>}
              <div className="profile-confirm-actions">
                <button
                  type="button"
                  className="profile-confirm-cancel"
                  onClick={() => setSaveModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="profile-confirm-save">
                  Save Changes
                </button>
              </div>
            </form>
          </div>,
          document.body,
        )}

      {/* Password-change confirmation — opens after "Update Password" and
          uses the same confirm-dialog design as Save Changes / Delete. */}
      {pwdConfirmOpen &&
        createPortal(
          <div
            className="profile-confirm-backdrop"
            role="presentation"
            onClick={() => setPwdConfirmOpen(false)}
          >
            <form
              className="profile-confirm-modal"
              role="dialog"
              aria-modal="true"
              onSubmit={handleConfirmedPasswordSave}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="profile-confirm-close"
                aria-label="Close"
                onClick={() => setPwdConfirmOpen(false)}
              >
                <X size={18} />
              </button>
              <h3>Update your password?</h3>
              <p className="profile-confirm-text">
                You will be signed in with your new password after this
                change. This cannot be undone.
              </p>
              {pwdConfirmError && (
                <p className="profile-msg error">{pwdConfirmError}</p>
              )}
              <div className="profile-confirm-actions">
                <button
                  type="button"
                  className="profile-confirm-cancel"
                  onClick={() => setPwdConfirmOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="profile-confirm-save">
                  Yes, Update Password
                </button>
              </div>
            </form>
          </div>,
          document.body,
        )}

      {dangerOpen &&
        createPortal(
          <div
            className="profile-confirm-backdrop"
            role="presentation"
            onClick={() => setDangerOpen(false)}
          >
            <form
              className="profile-confirm-modal"
              role="dialog"
              aria-modal="true"
              onSubmit={handleDeleteAccount}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="profile-confirm-close"
                aria-label="Close"
                onClick={() => setDangerOpen(false)}
              >
                <X size={18} />
              </button>
              <h3>Delete your account?</h3>
              <p className="profile-confirm-text">
                This permanently deletes <strong>your account</strong>, your
                saved cart, addresses and order history. Enter your password to
                confirm.
              </p>
              <label>
                Password
                <input
                  type="password"
                  value={dangerPassword}
                  onChange={(e) => setDangerPassword(e.target.value)}
                  // new-password instead of current-password so browsers do
                  // not auto-fill the saved password into this field.
                  autoComplete="new-password"
                  placeholder="Your password"
                />
              </label>
              {dangerError && (
                <p className="profile-msg error">{dangerError}</p>
              )}
              <div className="profile-confirm-actions">
                <button
                  type="button"
                  className="profile-confirm-cancel"
                  onClick={() => setDangerOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="profile-confirm-delete">
                  Yes, delete my account
                </button>
              </div>
            </form>
          </div>,
          document.body,
        )}
    </>
  );
}

/* ---------------- My Addresses tab ---------------- */
// The address book: adding and editing both open a modal form, and deleting
// asks for a confirmation first.
function AddressesSection({ customer }) {
  const addresses = customer.addresses || [];
  // null = modal closed; EMPTY_ADDRESS = "add new"; an entry = editing it.
  const [draft, setDraft] = useState(null);
  const [formError, setFormError] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const startEdit = (entry) => {
    setDraft({ ...entry });
    setFormError(null);
  };

  const handleSave = (event) => {
    event.preventDefault();
    const result = saveCustomerAddress(draft);
    if (result.ok) {
      setDraft(null);
      setFormError(null);
      notify(draft.id ? "Address updated." : "Address added.", "success");
    } else {
      setFormError(result.error);
      notify(result.error, "error");
    }
  };

  const handleDelete = (entry) => {
    deleteCustomerAddress(entry.id);
    setDeleting(null);
    notify("Address deleted.", "info");
  };

  return (
    <>
      <div className="profile-card">
        <div className="profile-card-head">
          <h3>Saved Addresses</h3>
          <button
            type="button"
            className="profile-primary-btn"
            onClick={() => {
              setDraft({ ...EMPTY_ADDRESS });
              setFormError(null);
            }}
          >
            <MapPin size={14} /> Add New Address
          </button>
        </div>
        {addresses.length === 0 && (
          <p className="profile-empty">
            No saved addresses yet — add one so checkout is faster.
          </p>
        )}
        <ul className="profile-address-list">
          {addresses.map((entry) => (
            <li key={entry.id}>
              <div className="profile-address-head">
                <strong>
                  <UserRound size={13} /> {entry.fullName}
                </strong>
                {entry.isDefault && (
                  <span className="profile-badge">Default</span>
                )}
              </div>
              <p>
                <Phone size={12} /> {entry.phone}
              </p>
              <p>
                <MapPin size={12} /> {entry.street}, {entry.barangay}, Hagonoy,
                Bulacan
              </p>
              <div className="profile-address-actions">
                <button type="button" onClick={() => startEdit(entry)}>
                  <Pencil size={12} /> Edit
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => setDeleting(entry)}
                >
                  <Trash2 size={12} /> Delete
                </button>
                <button
                  type="button"
                  className="ghost"
                  disabled={entry.isDefault}
                  onClick={() => setDefaultCustomerAddress(entry.id)}
                >
                  Set as Default
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Add / edit address modal — portaled so the fixed backdrop centers
          on the viewport (the content column's entrance animation would
          otherwise become its containing block and shift the modal). */}
      {draft &&
        createPortal(
          <div
            className="profile-confirm-backdrop"
            role="presentation"
            onClick={() => setDraft(null)}
          >
            <form
              className="profile-address-modal"
              role="dialog"
              aria-modal="true"
              onSubmit={handleSave}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="profile-confirm-close"
                aria-label="Close"
                onClick={() => setDraft(null)}
              >
                <X size={18} />
              </button>
              <h3>{draft.id ? "Edit Address" : "Add New Address"}</h3>
              {formError && <p className="profile-msg error">{formError}</p>}
              <label>
                Full Name
                <input
                  type="text"
                  value={draft.fullName}
                  onChange={(e) =>
                    setDraft({ ...draft, fullName: e.target.value })
                  }
                />
              </label>
              <label>
                Phone Number <small>(11 digits)</small>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  value={draft.phone}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      phone: e.target.value.replace(/\D/g, "").slice(0, 11),
                    })
                  }
                  placeholder="09XXXXXXXXX"
                />
              </label>
              <label>
                Barangay
                <select
                  value={draft.barangay}
                  onChange={(e) =>
                    setDraft({ ...draft, barangay: e.target.value })
                  }
                >
                  <option value="">Select a barangay…</option>
                  {BARANGAYS.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Street Name, Building, House No.
                <input
                  type="text"
                  value={draft.street}
                  onChange={(e) =>
                    setDraft({ ...draft, street: e.target.value })
                  }
                />
              </label>
              <div className="profile-switch-row">
                <span>Set as default address</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={draft.isDefault}
                  className={`profile-switch${draft.isDefault ? " on" : ""}`}
                  onClick={() =>
                    setDraft({ ...draft, isDefault: !draft.isDefault })
                  }
                >
                  <span className="profile-switch-knob" />
                </button>
              </div>
              <div className="profile-confirm-actions">
                <button
                  type="button"
                  className="profile-confirm-cancel"
                  onClick={() => setDraft(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="profile-primary-btn">
                  Save Address
                </button>
              </div>
            </form>
          </div>,
          document.body,
        )}

      {/* Delete confirmation modal — portaled for the same reason. */}
      {deleting &&
        createPortal(
          <div
            className="profile-confirm-backdrop"
            role="presentation"
            onClick={() => setDeleting(null)}
          >
            <div
              className="profile-confirm-modal"
              role="dialog"
              aria-modal="true"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="profile-confirm-close"
                aria-label="Close"
                onClick={() => setDeleting(null)}
              >
                <X size={18} />
              </button>
              <h3>Delete this address?</h3>
              <p className="profile-confirm-text">
                {deleting.fullName} — {deleting.street}, {deleting.barangay}{" "}
                will be permanently removed from your address book.
              </p>
              <div className="profile-confirm-actions">
                <button
                  type="button"
                  className="profile-confirm-cancel"
                  onClick={() => setDeleting(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="profile-confirm-delete"
                  onClick={() => handleDelete(deleting)}
                >
                  Yes, delete
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

/* ---------------- My Orders tab ---------------- */
// Everything that is not Completed yet — running orders plus cancelled ones
// (cancelled orders stay here with a Delete button). Completed orders live
// in the Order History tab.
function OrdersSection({ orders, rewardOrders = [], focusedOrderId }) {
  const [confirmCancel, setConfirmCancel] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const focusedRewardOrder = rewardOrders.find(
    (order) => order.id === focusedOrderId,
  );
  const visibleOrders = focusedRewardOrder
    ? [...orders, focusedRewardOrder]
    : orders;
  const active = visibleOrders.filter(
    (order) =>
      order.status !== "Completed" || order.id === focusedOrderId,
  );

  useEffect(() => {
    if (!focusedOrderId) return undefined;
    const timer = setTimeout(() => {
      document
        .getElementById(`customer-order-${focusedOrderId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
    return () => clearTimeout(timer);
  }, [focusedOrderId]);

  const handleCancel = (order) => {
    if (order.kind === "redemption") {
      cancelRedemptionOrder(order.id);
    } else {
      cancelCustomerOrder(order.id);
    }
    notify(`Order ${order.code} was cancelled.`);
    setConfirmCancel(null);
  };
  const handleDelete = (order) => {
    if (order.kind === "redemption") {
      deleteRedemptionOrder(order.id);
    } else {
      deleteCustomerOrder(order.id);
    }
    notify(`Order ${order.code} was deleted.`);
    setConfirmDelete(null);
  };

  if (active.length === 0) {
    return (
      <div className="profile-card">
        <h3>My Orders</h3>
        <p className="profile-empty">
          No active orders right now — anything you order will show up here with
          its live status.
        </p>
      </div>
    );
  }

  return (
    <div className="profile-card">
      <h3>My Orders</h3>
      <p className="profile-empty">
        Pick-up (walk-in): Pending → Preparing → Ready to Claim → Completed.
        Delivery: Pending → Preparing → Out for Delivery → Completed. You can
        cancel while the order is still Pending; cancelled orders stay here
        until deleted.
      </p>
      <ul className="profile-orders">
        {active.map((order) => (
          <OrderRow
            key={order.id}
            order={order}
            onCancel={() => setConfirmCancel(order)}
            onDelete={() => setConfirmDelete(order)}
            highlighted={order.id === focusedOrderId}
          />
        ))}
      </ul>

      {/* Cancel confirmation — only reachable for Pending orders. */}
      {confirmCancel &&
        createPortal(
          <div
            className="profile-confirm-backdrop"
            role="presentation"
            onClick={() => setConfirmCancel(null)}
          >
            <div
              className="profile-confirm-modal"
              role="dialog"
              aria-modal="true"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="profile-confirm-close"
                aria-label="Close"
                onClick={() => setConfirmCancel(null)}
              >
                <X size={18} />
              </button>
              <h3>Cancel this order?</h3>
              <p className="profile-confirm-text">
                {confirmCancel.code} — ₱{confirmCancel.total.toLocaleString()}{" "}
                will be cancelled. Orders can only be cancelled while they are
                still Pending.
              </p>
              <div className="profile-confirm-actions">
                <button
                  type="button"
                  className="profile-confirm-cancel"
                  onClick={() => setConfirmCancel(null)}
                >
                  Keep Order
                </button>
                <button
                  type="button"
                  className="profile-confirm-delete"
                  onClick={() => handleCancel(confirmCancel)}
                >
                  Yes, Cancel Order
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Delete confirmation for cancelled orders. */}
      {confirmDelete &&
        createPortal(
          <div
            className="profile-confirm-backdrop"
            role="presentation"
            onClick={() => setConfirmDelete(null)}
          >
            <div
              className="profile-confirm-modal"
              role="dialog"
              aria-modal="true"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="profile-confirm-close"
                aria-label="Close"
                onClick={() => setConfirmDelete(null)}
              >
                <X size={18} />
              </button>
              <h3>Delete this order?</h3>
              <p className="profile-confirm-text">
                {confirmDelete.code} will be permanently removed from your
                orders. This cannot be undone.
              </p>
              <div className="profile-confirm-actions">
                <button
                  type="button"
                  className="profile-confirm-cancel"
                  onClick={() => setConfirmDelete(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="profile-confirm-delete"
                  onClick={() => handleDelete(confirmDelete)}
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

/* ---------------- Order History tab ---------------- */
// Completed orders only, newest first — each with a Delete button.
function HistorySection({ orders }) {
  const [confirmDelete, setConfirmDelete] = useState(null);
  const completed = orders.filter((order) => order.status === "Completed");

  const handleDelete = (order) => {
    deleteCustomerOrder(order.id);
    notify(`Order ${order.code} was deleted.`);
    setConfirmDelete(null);
  };

  if (completed.length === 0) {
    return (
      <div className="profile-card">
        <h3>Order History</h3>
        <p className="profile-empty">
          No completed orders yet — orders move here once their status reaches
          Completed.
        </p>
      </div>
    );
  }

  return (
    <div className="profile-card">
      <h3>Order History</h3>
      <p className="profile-empty">
        {completed.length} completed{" "}
        {completed.length === 1 ? "order" : "orders"}, newest first.
      </p>
      <ul className="profile-orders">
        {completed.map((order) => (
          <OrderRow
            key={order.id}
            order={order}
            onDelete={() => setConfirmDelete(order)}
          />
        ))}
      </ul>

      {/* Delete confirmation for completed orders. */}
      {confirmDelete &&
        createPortal(
          <div
            className="profile-confirm-backdrop"
            role="presentation"
            onClick={() => setConfirmDelete(null)}
          >
            <div
              className="profile-confirm-modal"
              role="dialog"
              aria-modal="true"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="profile-confirm-close"
                aria-label="Close"
                onClick={() => setConfirmDelete(null)}
              >
                <X size={18} />
              </button>
              <h3>Delete this order?</h3>
              <p className="profile-confirm-text">
                {confirmDelete.code} — ₱{confirmDelete.total.toLocaleString()}{" "}
                will be permanently removed from your order history. This cannot
                be undone.
              </p>
              <div className="profile-confirm-actions">
                <button
                  type="button"
                  className="profile-confirm-cancel"
                  onClick={() => setConfirmDelete(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="profile-confirm-delete"
                  onClick={() => handleDelete(confirmDelete)}
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

// One order card, shared by the My Orders and Order History sections. The
// red Cancel Order button sits in the head row, right before the status,
// and is only shown while the order is still Pending. Completed / cancelled
// orders use the small trash icon beside the status for deletion.
function OrderRow({ order, onCancel, onDelete, highlighted = false }) {
  return (
    <li
      id={`customer-order-${order.id}`}
      className={highlighted ? "profile-order-highlighted" : ""}
    >
      <div className="profile-order-head">
        <strong>{order.code}</strong>
        <div className="profile-order-head-right">
          {order.status === "Pending" && onCancel && (
            <button
              type="button"
              className="profile-order-cancel"
              onClick={onCancel}
            >
              Cancel Order
            </button>
          )}
          {onDelete && (order.status === "Cancelled" || order.status === "Completed") && (
            <button
              type="button"
              className="profile-order-delete-icon"
              onClick={onDelete}
              aria-label={`Delete order ${order.code}`}
              title="Delete order"
            >
              <Trash2 size={14} />
            </button>
          )}
          <span
            className="profile-status"
            style={{
              color: STATUS_STYLES[order.status] || "#54706c",
              background: `${STATUS_STYLES[order.status] || "#54706c"}1a`,
            }}
          >
            {order.status}
          </span>
        </div>
      </div>
      <p className="profile-order-meta">
        {new Date(order.createdAt).toLocaleString()} •{" "}
        {order.mode === "delivery" ? "Delivery" : "Pick Up"} •{" "}
        {order.paymentMethod}
      </p>
      <ul className="profile-order-items">
        {order.items.map((item) => (
          <li key={item.uid}>
            {item.quantity}× {item.name}
            {(item.summary || []).length > 0 ? (
              <small>
                {" "}
                — {item.summary.map((entry) => entry.choice).join(", ")}
              </small>
            ) : null}
          </li>
        ))}
      </ul>
      {order.address && (
        <p className="profile-order-meta">
          <MapPin size={11} /> {order.address.street}, {order.address.barangay}{" "}
          — {order.address.fullName}
        </p>
      )}
      {order.notes && (
        <p className="profile-order-meta">Notes: {order.notes}</p>
      )}
      <div className="profile-order-total">
        <span>
          {order.mode === "delivery"
            ? `incl. ₱${order.deliveryFee} delivery fee`
            : "pick up — no delivery fee"}
        </span>
        <strong>₱{order.total.toLocaleString()}</strong>
      </div>
    </li>
  );
}

// ---------------- Loyalty Card tab ----------------
// The stamp card: ₱200 spent on a completed order = 1 stamp (₱1,000 in one
// checkout = 5). Six stamps open a 3-day Claim Reward window; claiming
// activates a 3-day window to redeem one free coffee (Coffee category).
// Placing that reward starts the next cycle. A Pending cancellation restores
// the original 6/6 card and timer. Redeem History keeps terminal redemptions.
function LoyaltySection() {
  const [now, setNow] = useState(Date.now());
  const [confirm, setConfirm] = useState(null); // { kind, order }
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const card = getLoyaltyCard();
  const redemptions = getRedemptionOrders();
  const running = redemptions.filter(
    (order) => order.status !== "Completed" && order.status !== "Cancelled",
  );
  const history = redemptions.filter(
    (order) => order.status === "Completed" || order.status === "Cancelled",
  );
  const hasActiveReward = running.length > 0;

  const isClaimable =
    card.stamps >= 6 && !card.claimedAt && !hasActiveReward;
  const isActive = Boolean(card.claimedAt);
  const deadline = isActive ? card.claimedAt : isClaimable ? card.sixAt : null;
  const remaining = deadline
    ? Math.max(0, deadline + LOYALTY_WINDOW_MS - now)
    : 0;
  const countdown = (ms) => {
    const total = Math.floor(ms / 1000);
    const d = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${d}d ${h}h ${m}m ${String(s).padStart(2, "0")}s`;
  };

  const handleClaim = () => {
    const result = claimLoyaltyReward();
    if (!result.ok) notify(result.error, "error");
  };

  return (
    <>
      <div className="profile-card loyalty-card-panel">
        <h3>Digital Loyalty Card</h3>
        <div className="loyalty-visual">
          <img src="/images/loyalty-card.png" alt="Cafétcha loyalty card" />
          <div className="loyalty-stamps">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <span
                key={index}
                className={`loyalty-stamp${index < card.stamps ? " filled" : ""}`}
              >
                {index < card.stamps && (
                  <img src="/images/logo.png" alt="Stamp" />
                )}
              </span>
            ))}
          </div>
        </div>

        <div className="loyalty-progress">
          <strong>
            {card.stamps}/6 stamps
            {isActive
              ? " — reward activated"
              : isClaimable
                ? " — card full!"
                : ""}
          </strong>
          <span>Every ₱200 spent on a completed order earns 1 stamp.</span>
        </div>

        {isClaimable && (
          <div className="loyalty-banner claimable">
            <div>
              <strong>Claim your reward</strong>
              <p>
                Free coffee reward unlocked — claim it within{" "}
                {countdown(remaining)} or the card resets.
              </p>
            </div>
            <button
              type="button"
              className="loyalty-claim-btn"
              onClick={handleClaim}
            >
              Claim Reward
            </button>
          </div>
        )}

        {isActive && (
          <div className="loyalty-banner active">
            <div>
              <strong>Loyalty card activated!</strong>
              <p>
                One free coffee from the Coffee category is yours — open the
                Menu, pick any coffee and press “Redeem Free Coffee”.
              </p>
            </div>
            <span className="loyalty-timer">
              <Clock size={14} /> {countdown(remaining)}
            </span>
          </div>
        )}

        {!isClaimable && !isActive && (
          <p className="loyalty-note">
            Complete orders to earn stamps — once all 6 are collected you will
            have 3 days to claim and use your free coffee reward.
          </p>
        )}
      </div>

      <div className="profile-card">
        <h3>My Reward Orders</h3>
        {running.length === 0 ? (
          <p className="profile-empty">
            No active reward orders yet — claimed free coffees appear here while
            they are prepared.
          </p>
        ) : (
          <ul className="profile-orders">
            {running.map((order) => (
              <RedemptionRow
                key={order.id}
                order={order}
                onCancel={() => setConfirm({ kind: "cancel", order })}
              />
            ))}
          </ul>
        )}
      </div>
      <div className="profile-card">
        <h3>Redeem History</h3>
        {history.length === 0 ? (
          <p className="profile-empty">
            Completed and cancelled free-coffee orders will be listed here.
          </p>
        ) : (
          <ul className="profile-orders">
            {history.map((order) => (
              <RedemptionRow
                key={order.id}
                order={order}
                onDelete={() => setConfirm({ kind: "delete", order })}
              />
            ))}
          </ul>
        )}
      </div>

      {confirm &&
        createPortal(
          <div
            className="profile-confirm-backdrop"
            role="presentation"
            onClick={() => setConfirm(null)}
          >
            <div
              className="profile-confirm-modal"
              role="dialog"
              aria-modal="true"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="profile-confirm-close"
                aria-label="Close"
                onClick={() => setConfirm(null)}
              >
                <X size={18} />
              </button>
              <h3>
                {confirm.kind === "cancel"
                  ? "Cancel this reward order?"
                  : "Delete this redeem record?"}
              </h3>
              <p className="profile-confirm-text">
                {confirm.kind === "cancel"
                  ? `${confirm.order.code} — your free coffee order will be cancelled. It can only be cancelled while still Pending.`
                  : `${confirm.order.code} will be permanently removed from your Redeem History. This cannot be undone.`}
              </p>
              <div className="profile-confirm-actions">
                <button
                  type="button"
                  className="profile-confirm-cancel"
                  onClick={() => setConfirm(null)}
                >
                  {confirm.kind === "cancel" ? "Keep Order" : "Cancel"}
                </button>
                <button
                  type="button"
                  className="profile-confirm-delete"
                  onClick={() => {
                    if (confirm.kind === "cancel") {
                      const result = cancelRedemptionOrder(confirm.order.id);
                      if (!result.ok) {
                        notify(result.error, "error");
                        return;
                      }
                      notify(
                        `Reward order ${confirm.order.code} was cancelled. Your 6/6 loyalty card and original timer were restored.`,
                      );
                    } else {
                      deleteRedemptionOrder(confirm.order.id);
                      notify(
                        `Redeem record ${confirm.order.code} was deleted.`,
                      );
                    }
                    setConfirm(null);
                  }}
                >
                  {confirm.kind === "cancel"
                    ? "Yes, Cancel Order"
                    : "Yes, Delete"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

// One redemption order row (My Reward Orders + Redeem History).
function RedemptionRow({ order, onCancel, onDelete }) {
  return (
    <li>
      <div className="profile-order-head">
        <strong>{order.code}</strong>
        <div className="profile-order-head-right">
          {order.status === "Pending" && onCancel && (
            <button
              type="button"
              className="profile-order-cancel"
              onClick={onCancel}
            >
              Cancel Order
            </button>
          )}
          {onDelete &&
            (order.status === "Completed" || order.status === "Cancelled") && (
            <button
              type="button"
              className="profile-order-delete-icon"
              onClick={onDelete}
              aria-label={`Delete order ${order.code}`}
              title="Delete order"
            >
              <Trash2 size={14} />
            </button>
          )}
          <span
            className="profile-status"
            style={{
              color: STATUS_STYLES[order.status] || "#54706c",
              background: `${STATUS_STYLES[order.status] || "#54706c"}1a`,
            }}
          >
            {order.status}
          </span>
        </div>
      </div>
      <p className="profile-order-meta">
        {new Date(order.createdAt).toLocaleString()} •{" "}
        {order.mode === "delivery" ? "Delivery" : "Pick Up"} •{" "}
        {order.paymentMethod}
      </p>
      <ul className="profile-order-items">
        {order.items.map((item) => (
          <li key={item.uid}>
            {item.quantity}× {item.name}
            {(item.summary || []).length > 0 ? (
              <small>
                {" "}
                — {item.summary.map((entry) => entry.choice).join(", ")}
              </small>
            ) : null}
          </li>
        ))}
      </ul>
      {order.address && (
        <p className="profile-order-meta">
          <MapPin size={11} /> {order.address.street}, {order.address.barangay}{" "}
          — {order.address.fullName}
        </p>
      )}
      {order.notes && (
        <p className="profile-order-meta">Notes: {order.notes}</p>
      )}
      <div className="profile-order-total">
        <span>
          <Coffee size={12} /> Loyalty reward — free coffee
        </span>
        <strong>FREE</strong>
      </div>
    </li>
  );
}

export default ProfilePage;
