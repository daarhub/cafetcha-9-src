import { useState } from "react";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Coffee,
  MapPin,
  Search,
  Store,
  Trash2,
  Truck,
} from "lucide-react";
import StaffSidebar from "./StaffSidebar";
import StaffConfirmDialog from "./StaffConfirmDialog";
import { notify } from "../Customer/toastStore";
import {
  deleteStaffOrder,
  getAllCustomers,
  getAllStaffOrders,
  useCustomerStore,
} from "../Customer/customerStore";
import "./StaffOrders.css";
import "./StaffOrderHistory.css";

const STATUS_COLORS = {
  Completed: "#2e8b57",
  Cancelled: "#b3261e",
};

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const customerName = (order, customers) => {
  const account = customers.find((entry) => entry.id === order.customerId);
  const accountName = account
    ? `${account.firstName} ${account.lastName}`.trim()
    : "Guest customer";
  if (order.mode === "pickup") {
    return (
      [order.pickupName?.firstName, order.pickupName?.lastName]
        .filter(Boolean)
        .join(" ") || accountName
    );
  }
  return order.address?.fullName || accountName;
};

const peso = (amount) =>
  amount
    ? `₱${amount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : "FREE";

const orderSearchText = (order, customers) =>
  [
    order.code,
    customerName(order, customers),
    order.mode,
    order.items?.map((item) => item.name).join(" "),
    order.address?.street,
    order.address?.barangay,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

function StaffOrderHistory() {
  useCustomerStore();
  const [query, setQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const allOrders = getAllStaffOrders();
  const customers = getAllCustomers();
  const historyOrders = allOrders
    .filter(
      (order) => order.status === "Completed" || order.status === "Cancelled",
    )
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const normalizedQuery = query.trim().toLowerCase();
  const visibleOrders = historyOrders.filter(
    (order) =>
      !normalizedQuery || orderSearchText(order, customers).includes(normalizedQuery),
  );
  const today = new Date().toDateString();
  const completedToday = historyOrders.filter(
    (order) =>
      order.status === "Completed" &&
      new Date(order.createdAt).toDateString() === today,
  ).length;
  const cancelledCount = historyOrders.filter(
    (order) => order.status === "Cancelled",
  ).length;

  const completedCount = historyOrders.filter(
    (order) => order.status === "Completed",
  ).length;

  const handleDelete = (order) => {
    const result = deleteStaffOrder(order.id);
    if (!result.ok) {
      notify(result.error || "Order could not be deleted.", "error");
      setConfirmDelete(null);
      return;
    }
    notify(`Order ${order.code} was deleted from staff history.`);
    setConfirmDelete(null);
  };

  return (
    <>
      <StaffSidebar />
      <main className="staff-page staff-history-page">
        <header className="staff-page-header">
          <div>
            <span className="staff-page-eyebrow">STAFF PANEL / HISTORY</span>
            <h1>Order History</h1>
            <p>Completed and cancelled orders are kept here for easy reference and searching.</p>
          </div>
          <a href="/staff/orders" className="staff-page-link">
            Back to active orders <ArrowRight size={14} />
          </a>
        </header>

        <section className="staff-orders-summary staff-history-summary" aria-label="Order history summary">
          <article className="staff-summary-card staff-summary-card-dark">
            <span>Completed orders</span>
            <strong>{completedCount}</strong>
            <small>Finished orders</small>
          </article>
          <article className="staff-summary-card">
            <span>Completed today</span>
            <strong>{completedToday}</strong>
            <small>Finished on this day</small>
          </article>
          <article className="staff-summary-card">
            <span>Cancelled orders</span>
            <strong>{cancelledCount}</strong>
            <small>Moved here from Orders</small>
          </article>
        </section>

        <section className="staff-surface staff-history-card">
          <div className="staff-orders-toolbar">
            <div>
              <h2>Completed and cancelled orders</h2>
              <p>Search by order code, customer name, item, or address.</p>
            </div>
            <label className="staff-search">
              <Search size={16} />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search order history"
                aria-label="Search order history"
              />
            </label>
          </div>


          {visibleOrders.length === 0 ? (
            <div className="staff-empty-state">
              <CheckCircle2 size={28} />
              <strong>No order history found</strong>
              <p>
                {historyOrders.length
                  ? "Try a different code, customer, or item."
                  : "Completed and cancelled orders will appear here after staff updates an order."}
              </p>
            </div>
          ) : (
            <div className="staff-history-list">
              {visibleOrders.map((order) => {
                const isReward = order.staffSource === "redemption";
                const ModeIcon = order.mode === "delivery" ? Truck : Store;
                return (
                  <article
                    className={`staff-history-order${isReward ? " staff-reward-card" : ""}`}
                    key={`${order.staffSource}-${order.id}`}
                  >
                    <header className="staff-history-order-head">
                      <div>
                        <strong>{order.code}</strong>
                        <span>
                          {isReward ? <Coffee size={13} /> : <CheckCircle2 size={13} />}
                          {isReward ? "Loyalty reward" : order.status === "Cancelled" ? "Cancelled order" : "Completed order"}
                        </span>
                      </div>
                      <div className="staff-history-head-actions">
                        <button
                          type="button"
                          className="staff-history-delete"
                          onClick={() => setConfirmDelete(order)}
                          aria-label={`Delete order ${order.code}`}
                          title="Delete order"
                        >
                          <Trash2 size={15} />
                        </button>
                        <span
                          className="staff-history-status"
                          style={{
                            color: STATUS_COLORS[order.status],
                            background: `${STATUS_COLORS[order.status]}1a`,
                          }}
                        >
                          {order.status}
                        </span>
                      </div>
                    </header>
                    <div className="staff-history-order-main">
                      <div>
                        <h3>{customerName(order, customers)}</h3>
                        <p>
                          <Calendar size={13} />
                          {formatDate(order.createdAt)}
                          <span>·</span>
                          <span className={`staff-history-mode ${order.mode}`}>
                            <ModeIcon size={13} />
                            {order.mode === "delivery" ? "Delivery" : "Pick up"}
                          </span>
                        </p>
                      </div>
                      <strong className="staff-history-total">{peso(order.total)}</strong>
                    </div>
                    <ul className="staff-history-items">
                      {(order.items || []).map((item) => (
                        <li key={item.uid || item.productId}>
                          <span>
                            <strong>{item.quantity || 1}×</strong> {item.name}
                          </span>
                          {(item.summary || []).length > 0 && (
                            <small>
                              {(item.summary || [])
                                .map((entry) => entry.choice)
                                .filter(Boolean)
                                .join(" · ")}
                            </small>
                          )}
                        </li>
                      ))}
                    </ul>
                    {order.address && (
                      <p className="staff-order-note">
                        <MapPin size={13} />
                        {order.address.street}, {order.address.barangay} · {order.address.fullName}
                      </p>
                    )}
                    {order.notes && <p className="staff-order-note">Notes: {order.notes}</p>}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {confirmDelete && (
          <StaffConfirmDialog
            title="Delete this order?"
            message={`${confirmDelete.code} will be permanently removed from staff order history. This cannot be undone.`}
            confirmLabel="Yes, Delete"
            onCancel={() => setConfirmDelete(null)}
            onConfirm={() => handleDelete(confirmDelete)}
          />
        )}
      </main>
    </>
  );
}

export default StaffOrderHistory;

