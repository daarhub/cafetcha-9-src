import { useState } from "react";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Coffee,
  MapPin,
  Search,
  Store,
  Truck,
} from "lucide-react";
import StaffSidebar from "./StaffSidebar";
import StaffConfirmDialog from "./StaffConfirmDialog";
import {
  getAllCustomers,
  getAllStaffOrders,
  ORDER_STATUSES,
  ORDER_STATUSES_BY_MODE,
  updateStaffOrderStatus,
  useCustomerStore,
} from "../Customer/customerStore";
import { notify } from "../Customer/toastStore";
import "./StaffOrders.css";

const STATUS_COLORS = {
  Pending: "#b45309",
  Preparing: "#f97316",
  "Out for Delivery": "#2563eb",
  "Ready to Claim": "#2563eb",
  Completed: "#2e8b57",
  Cancelled: "#b3261e",
};

const peso = (amount) =>
  amount
    ? `₱${amount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : "FREE";

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

const orderSearchText = (order, customers) =>
  [
    order.code,
    order.status,
    order.mode,
    order.notes,
    customerName(order, customers),
    order.address?.street,
    order.address?.barangay,
    ...(order.items || []).flatMap((item) => [
      item.name,
      ...(item.summary || []).map((entry) => entry.choice),
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const StatusSelect = ({ order, onChange }) => {
  const options = ORDER_STATUSES_BY_MODE[order.mode] || ORDER_STATUSES;
  return (
    <label className="staff-status-control">
      <span>Order status</span>
      <select value={order.status || "Pending"} onChange={onChange}>
        {options.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
    </label>
  );
};

const StaffOrderCard = ({ order, customers, onStatusChange }) => {
  const color = STATUS_COLORS[order.status] || "#573016";
  const isReward = order.staffSource === "redemption";
  const ModeIcon = order.mode === "delivery" ? Truck : Store;

  return (
    <article className={`staff-order-card${isReward ? " staff-reward-card" : ""}`}>
      <header className="staff-order-card-head">
        <div className="staff-order-identifiers">
          <strong className="staff-order-code">{order.code}</strong>
          <span className="staff-order-kind">
            {isReward ? <Coffee size={13} /> : <ClipboardList size={13} />}
            {isReward ? "Loyalty reward" : "Customer order"}
          </span>
        </div>
        <div className="staff-order-head-right">
          <span className={`staff-order-mode ${order.mode}`}>
            <ModeIcon size={14} />
            {order.mode === "delivery" ? "Delivery" : "Pick up"}
          </span>
          <span
            className="staff-order-status"
            style={{ color, background: `${color}1a` }}
          >
            {order.status || "Pending"}
          </span>
        </div>
      </header>

      <div className="staff-order-summary">
        <div>
          <h3>{customerName(order, customers)}</h3>
          <p>
            <Calendar size={13} />
            {formatDate(order.createdAt)}
          </p>
        </div>
        <StatusSelect
          order={order}
          onChange={(event) => onStatusChange(order, event.target.value)}
        />
      </div>

      <div className="staff-order-details">
        <div className="staff-order-items">
          {(order.items || []).map((item) => (
            <div className="staff-order-item" key={item.uid || item.productId}>
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
            </div>
          ))}
          {!order.items?.length && (
            <p className="staff-order-no-items">No item details available.</p>
          )}
        </div>
        <div className="staff-order-total">
          <span>Order total</span>
          <strong>{peso(order.total)}</strong>
        </div>
      </div>

      {order.address && (
        <p className="staff-order-note">
          <MapPin size={13} />
          {order.address.street}, {order.address.barangay} · {order.address.fullName}
        </p>
      )}
      {order.notes && <p className="staff-order-note">Notes: {order.notes}</p>}
    </article>
  );
};

function StaffOrders() {
  useCustomerStore();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [pendingStatusChange, setPendingStatusChange] = useState(null);

  const allOrders = getAllStaffOrders();
  const customers = getAllCustomers();
  const activeOrders = allOrders
    .filter(
      (order) => order.status !== "Completed" && order.status !== "Cancelled",
    )
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const normalizedQuery = query.trim().toLowerCase();
  const visibleOrders = activeOrders.filter((order) => {
    const matchesStatus =
      statusFilter === "All statuses" || order.status === statusFilter;
    const matchesQuery =
      !normalizedQuery || orderSearchText(order, customers).includes(normalizedQuery);
    return matchesStatus && matchesQuery;
  });

  const applyStatusChange = (order, status) => {
    const result = updateStaffOrderStatus(order.id, status);
    if (!result.ok) {
      notify(result.error, "error");
      return false;
    }
    notify(`Order ${order.code} is now ${status}.`);
    return true;
  };

  const handleStatusChange = (order, status) => {
    if (status === order.status) return;
    if (status === "Completed" || status === "Cancelled") {
      setPendingStatusChange({ order, status });
      return;
    }
    applyStatusChange(order, status);
  };

  const confirmStatusChange = () => {
    if (!pendingStatusChange) return;
    const { order, status } = pendingStatusChange;
    if (applyStatusChange(order, status)) setPendingStatusChange(null);
  };

  return (
    <>
      <StaffSidebar />
      <main className="staff-page staff-orders-page">
        <header className="staff-page-header">
          <div>
            <span className="staff-page-eyebrow">STAFF PANEL / ORDERS</span>
            <h1>Orders</h1>
            <p>Update customer orders as they move through the café.</p>
          </div>
          <a href="/staff/history" className="staff-page-link">
            View completed history <ArrowRight size={14} />
          </a>
        </header>

        <section className="staff-orders-summary" aria-label="Order summary">
          <article className="staff-summary-card staff-summary-card-dark">
            <span>Active orders</span>
            <strong>{activeOrders.length}</strong>
            <small>Orders that are not completed yet</small>
          </article>
          <article className="staff-summary-card">
            <span>Pending now</span>
            <strong>
              {activeOrders.filter((order) => order.status === "Pending").length}
            </strong>
            <small>Waiting to be prepared</small>
          </article>
          <article className="staff-summary-card">
            <span>Preparing</span>
            <strong>
              {activeOrders.filter((order) => order.status === "Preparing").length}
            </strong>
            <small>In the kitchen</small>
          </article>
          <article className="staff-summary-card">
            <span>Ready / delivery</span>
            <strong>
              {
                activeOrders.filter(
                  (order) =>
                    order.status === "Ready to Claim" ||
                    order.status === "Out for Delivery",
                ).length
              }
            </strong>
            <small>On the way or waiting to be claimed</small>
          </article>
        </section>

        <section className="staff-surface staff-orders-card">
          <div className="staff-orders-toolbar">
            <div>
              <h2>Active order queue</h2>
              <p>Choose a status below to keep customers updated. Orders are handled first come, first served.</p>
            </div>
            <label className="staff-search">
              <Search size={16} />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search code, customer, or item"
                aria-label="Search active orders"
              />
            </label>
          </div>

          <div className="staff-orders-filter">
            <span>Show</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter orders by status"
            >
              <option>All statuses</option>
              {Array.from(
                new Set(Object.values(ORDER_STATUSES_BY_MODE).flat()),
              )
                .filter((status) => status !== "Completed" && status !== "Cancelled")
                .map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
            </select>
            <span className="staff-orders-count">
              {visibleOrders.length} of {activeOrders.length} orders
            </span>
          </div>

          {visibleOrders.length === 0 ? (
            <div className="staff-empty-state">
              <CheckCircle2 size={28} />
              <strong>No active orders found</strong>
              <p>
                {activeOrders.length
                  ? "Try another search or status filter."
                  : "New customer orders will appear here automatically."}
              </p>
            </div>
          ) : (
            <div className="staff-order-list">
              {visibleOrders.map((order) => (
                <StaffOrderCard
                  key={`${order.staffSource}-${order.id}`}
                  order={order}
                  customers={customers}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          )}
        </section>

        {pendingStatusChange && (
          <StaffConfirmDialog
            title={
              pendingStatusChange.status === "Completed"
                ? "Complete this order?"
                : "Cancel this order?"
            }
            message={`${pendingStatusChange.order.code} will be marked as ${pendingStatusChange.status}. This updates the customer's live status.`}
            confirmLabel={
              pendingStatusChange.status === "Completed"
                ? "Yes, Complete"
                : "Yes, Cancel"
            }
            variant={
              pendingStatusChange.status === "Completed" ? "success" : "danger"
            }
            onCancel={() => setPendingStatusChange(null)}
            onConfirm={confirmStatusChange}
          />
        )}
      </main>
    </>
  );
}

export default StaffOrders;

