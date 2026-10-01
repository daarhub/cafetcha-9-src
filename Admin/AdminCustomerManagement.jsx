import { Mail, Search, Stamp, UserCheck, UserX, UsersRound } from "lucide-react";
import { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import StaffSidebar from "../Staff/StaffSidebar";
import AdminConfirmDialog from "./AdminConfirmDialog";
import { notify } from "../Customer/toastStore";
import {
  getCustomerManagementData,
  grantLoyaltyStamp,
  setCustomerAccountEnabled,
  useCustomerStore,
} from "../Customer/customerStore";
import "./AdminCustomerManagement.css";

const peso = (amount) =>
  `₱${Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
const date = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "No orders yet";

function AdminCustomerManagement({ staffMode = false }) {
  useCustomerStore();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All accounts");
  const [pendingStatus, setPendingStatus] = useState(null);
  const [pendingStamp, setPendingStamp] = useState(null);
  const customers = getCustomerManagementData();
  const normalized = query.trim().toLowerCase();
  const visible = customers.filter((customer) => {
    const text = `${customer.firstName} ${customer.lastName} ${customer.email}`.toLowerCase();
    const enabled = customer.accountEnabled !== false;
    return (
      text.includes(normalized) &&
      (status === "All accounts" || (status === "Active" ? enabled : !enabled))
    );
  });

  const confirmStatusChange = () => {
    if (!pendingStatus) return;
    const customer = pendingStatus;
    const enabled = customer.accountEnabled === false;
    const result = setCustomerAccountEnabled(customer.id, enabled);
    notify(
      result.ok
        ? `${customer.firstName} ${customer.lastName} is now ${enabled ? "active" : "disabled"}.`
        : result.error,
      result.ok ? "success" : "error",
    );
    setPendingStatus(null);
  };
  const confirmStamp = () => {
    if (!pendingStamp) return;
    const result = grantLoyaltyStamp(pendingStamp.id);
    notify(
      result.ok
        ? `1 loyalty stamp was added to ${pendingStamp.firstName} ${pendingStamp.lastName}.`
        : result.error,
      result.ok ? "success" : "error",
    );
    setPendingStamp(null);
  };



  return (
    <>
      {staffMode ? <StaffSidebar /> : <AdminSidebar />}
      <main className="admin-management-page admin-customer-management-page">
        <header className="admin-management-header">
          <div>
            <span>{staffMode ? "STAFF PANEL" : "ADMIN PANEL"}</span>
            <h1>Customer Management</h1>
            <p>{staffMode ? "View customer activity and give loyalty stamps." : "Review customer activity, spending, and login access."}</p>
          </div>
          <UsersRound size={32} />
        </header>

        <section className="admin-management-summary">
          <article><span>Customers</span><strong>{customers.length}</strong><small>All registered accounts</small></article>
          <article><span>Active accounts</span><strong>{customers.filter((customer) => customer.accountEnabled !== false).length}</strong><small>Allowed to sign in</small></article>

        </section>

        <section className="admin-management-panel">
          <div className="admin-management-toolbar">
            <label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customer name or email" /></label>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option>All accounts</option><option>Active</option><option>Disabled</option>
            </select>
          </div>
          <div className="admin-customer-list">
            {visible.map((customer) => {
              const enabled = customer.accountEnabled !== false;
              return (
                <article key={customer.id} className={enabled ? "" : "is-disabled"}>
                  <span className="admin-customer-avatar">{customer.firstName[0]}{customer.lastName[0]}</span>
                  <div className="admin-customer-main">
                    <strong>{customer.firstName} {customer.lastName}</strong>
                    <span><Mail size={14} />{customer.email}</span>
                    <small>Joined {date(customer.createdAt)} · Last order {date(customer.lastOrder)}</small>
                  </div>
                  <div className="admin-customer-stats">
                    <span><b>{customer.orderCount}</b>orders</span>
                    <span><b>{customer.activeCount}</b>active</span>
                    <span><b>{customer.completedCount}</b>completed</span>
                    <span><b>{customer.loyaltyStamps}/6</b>stamps</span>
                    <span><b>{peso(customer.totalSpent)}</b>spent</span>
                  </div>
                  <div className="admin-customer-card-control">
                    <span className={`admin-status-pill ${enabled ? "available" : "disabled"}`}>{enabled ? "Active" : "Disabled"}</span>
                    <button className="admin-customer-toggle loyalty-stamp-button" type="button" onClick={() => setPendingStamp(customer)} title="Give one loyalty stamp"><Stamp size={20} /><small>{customer.loyaltyStamps}/6</small></button>
                    {!staffMode && <button className="admin-customer-toggle" type="button" onClick={() => setPendingStatus(customer)} title={enabled ? "Disable customer login" : "Enable customer login"}>
                      {enabled ? <UserX size={20} /> : <UserCheck size={20} />}
                    </button>}
                  </div>
                </article>
              );
            })}
          </div>
          {!visible.length && <p className="admin-empty">No customer accounts matched your search.</p>}
        </section>
      </main>

      {pendingStatus && (
        <AdminConfirmDialog
          title={pendingStatus.accountEnabled === false ? "Enable this customer account?" : "Disable this customer account?"}
          message={`${pendingStatus.firstName} ${pendingStatus.lastName} will be ${pendingStatus.accountEnabled === false ? "allowed to sign in again" : "signed out and blocked from signing in again"}. Their orders and saved information will not be deleted.`}
          confirmLabel={pendingStatus.accountEnabled === false ? "Yes, enable" : "Yes, disable"}
          variant={pendingStatus.accountEnabled === false ? "success" : "danger"}
          icon={pendingStatus.accountEnabled === false ? UserCheck : UserX}
          onCancel={() => setPendingStatus(null)}
          onConfirm={confirmStatusChange}
        />
      )}

      {pendingStamp && (
        <AdminConfirmDialog
          title="Give one loyalty stamp?"
          message={`${pendingStamp.firstName} ${pendingStamp.lastName} will receive 1 stamp. Their current card is ${pendingStamp.loyaltyStamps}/6.`}
          confirmLabel="Yes, give stamp"
          variant="success"
          icon={Stamp}
          onCancel={() => setPendingStamp(null)}
          onConfirm={confirmStamp}
        />
      )}
    </>
  );
}


export default AdminCustomerManagement;
