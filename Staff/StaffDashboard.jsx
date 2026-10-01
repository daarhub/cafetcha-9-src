import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChefHat,
  Gift,
  Hourglass,
  ShoppingBag,
  Store,
  Truck,
  XCircle,
} from "lucide-react";
import StaffSidebar from "./StaffSidebar";
import {
  getAllCustomers,
  getAllOrders,
  getAllRedemptionOrders,
  getAllStaffOrders,
  useCustomerStore,
} from "../Customer/customerStore";
import { useAdminManagement, getCurrentStaff } from "../Admin/adminManagementStore";
import "./StaffDashboard.css";

// ---------------------------------------------------------------------------
// Live numbers
// ---------------------------------------------------------------------------
// Every count here is real: orders come straight from the customer store
// (each checkout lands there as "Pending") and loyalty orders from the
// loyalty records, so the statistics update the moment a customer orders or
// a status changes. No demo values are mixed in.

const peso = (amount) =>
  amount
    ? `₱${amount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : "FREE";

// Status pill colors — the same color language the customer's My Orders
// page uses, so a status reads as the same color on both sides.
const STATUS_COLORS = {
  Pending: "#b45309",
  Preparing: "#f97316",
  "Out for Delivery": "#2563eb",
  "Ready to Claim": "#2563eb",
  Completed: "#2e8b57",
  Cancelled: "#b3261e",
};

// Queue ordering is handled below as first-come, first-served.

// /staff — the staff dashboard (home of the Staff Panel): the welcome header
// with today's date, the statistics the staff works with, and the live order
// queue underneath.
function StaffDashboard() {
  // Subscribes the overview to the store — a new checkout or a status change
  // re-renders the statistics and the queue right away.
  useCustomerStore();
  useAdminManagement();

  const orders = getAllOrders();
  const staffOrders = getAllStaffOrders();
  const redemptions = getAllRedemptionOrders();
  const customers = getAllCustomers();
  const currentStaff = getCurrentStaff();
  const staffFirstName = currentStaff?.name?.split(" ")[0] || "STAFF";

  const todayKey = new Date().toDateString();
  const isToday = (iso) => new Date(iso).toDateString() === todayKey;

  // ------------------------------ statistics ------------------------------
  const ordersToday = orders.filter((order) => isToday(order.createdAt));
  const deliveryToday = ordersToday.filter(
    (order) => order.mode === "delivery",
  ).length;
  const pickupToday = ordersToday.filter(
    (order) => order.mode === "pickup",
  ).length;

  const countStatus = (status) =>
    orders.filter((order) => order.status === status).length;

  const pendingCount = countStatus("Pending");
  const preparingCount = countStatus("Preparing");
  const outForDeliveryCount = countStatus("Out for Delivery");
  const readyToClaimCount = countStatus("Ready to Claim");
  const completedCount = countStatus("Completed");
  const cancelledCount = countStatus("Cancelled");

  // Loyalty Orders — free coffees claimed through a loyalty card that were
  // completed today (a redemption lands as "Pending" when a customer spends
  // their six stamps and turns "Completed" when staff hands the order over).
  const loyaltyCompletedToday = redemptions.filter(
    (order) => order.status === "Completed" && isToday(order.createdAt),
  ).length;
  const pendingRewards = redemptions.filter(
    (order) => order.status === "Pending",
  );

  // --------------------------- live order queue ---------------------------
  // First come, first served: the oldest active order stays at the top until
  // staff moves it forward. Completed and cancelled orders live in history.
  const queue = [...staffOrders]
    .filter(
      (order) => order.status !== "Completed" && order.status !== "Cancelled",
    )
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .slice(0, 8);

  const customerName = (customerId) => {
    const customer = customers.find((entry) => entry.id === customerId);
    return customer ? `${customer.firstName} ${customer.lastName}` : "Guest";
  };

  // Pickup orders carry the name the customer typed for the claim; delivery
  // orders show the account holder.
  const customerLabel = (order) => {
    if (order.mode === "pickup") {
      const pickup = [order.pickupName?.firstName, order.pickupName?.lastName]
        .filter(Boolean)
        .join(" ");
      return pickup || customerName(order.customerId);
    }
    return order.address?.fullName || customerName(order.customerId);
  };

  const whenOf = (iso) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return date.toDateString() === todayKey
      ? date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
      : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const queueLine = (order) => {
    const first = order.items?.[0];
    if (!first) return "No items";
    const extra = (order.items?.length || 1) - 1;
    return extra > 0 ? `${first.name} +${extra} more` : first.name;
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const renderQueueRow = (order) => {
    const color = STATUS_COLORS[order.status] || "#573016";
    return (
      <article
        className="staff-queue-row"
        key={`${order.staffSource || "order"}-${order.id}`}
      >
        <span className="staff-queue-code">{order.code}</span>

        <div className="staff-queue-info">
          <h3>{queueLine(order)}</h3>
          <p>
            <span className={`staff-queue-mode ${order.mode}`}>
              {order.mode === "delivery" ? <Truck size={11} /> : <Store size={11} />}
              {order.mode === "delivery" ? "Delivery" : "Pickup"}
            </span>
            {" · "}
            {customerLabel(order)} · {whenOf(order.createdAt)}
          </p>
        </div>

        <span className="staff-queue-total">{peso(order.total)}</span>

        <span
          className="staff-queue-status"
          style={{ color, background: `${color}1f` }}
        >
          {order.status}
        </span>
      </article>
    );
  };

  return (
    <>
      <StaffSidebar />

      <main className="staff-dashboard">
        {/* ========================= WELCOME HEADER ========================= */}
        <header className="staff-welcome">
          <div>
            <h1>WELCOME, {staffFirstName.toUpperCase()}!</h1>
            <p>Here&apos;s what&apos;s happening at Cafétcha today.</p>
          </div>

          <span className="staff-date-pill">
            <Calendar size={15} />
            {today}
          </span>
        </header>

        <div className="staff-grid">
          {/* ================ LEFT: STATISTICS + LIVE QUEUE ================ */}
          <section className="staff-main-col">
            <div className="staff-stats">
              {/* Total orders placed today */}
              <article className="staff-stat staff-stat-dark">
                <span className="staff-stat-icon">
                  <ShoppingBag size={24} strokeWidth={1.9} />
                </span>
                <div className="staff-stat-body">
                  <span className="staff-stat-label">Total Orders Today</span>
                  <strong className="staff-stat-value">
                    {ordersToday.length}
                  </strong>
                  <span className="staff-stat-sub">
                    {deliveryToday} delivery · {pickupToday} pickup
                  </span>
                </div>
              </article>

              {/* Orders still waiting to be prepared */}
              <article className="staff-stat">
                <span className="staff-stat-icon">
                  <Hourglass size={24} strokeWidth={1.9} />
                </span>
                <div className="staff-stat-body">
                  <span className="staff-stat-label">Pending Orders</span>
                  <strong className="staff-stat-value">{pendingCount}</strong>
                  <span className="staff-stat-sub">
                    waiting to be prepared
                  </span>
                </div>
              </article>

              {/* Orders currently in the kitchen */}
              <article className="staff-stat">
                <span className="staff-stat-icon">
                  <ChefHat size={24} strokeWidth={1.9} />
                </span>
                <div className="staff-stat-body">
                  <span className="staff-stat-label">Preparing</span>
                  <strong className="staff-stat-value">{preparingCount}</strong>
                  <span className="staff-stat-sub">in the kitchen</span>
                </div>
              </article>

              {/* Delivery orders on the road */}
              <article className="staff-stat">
                <span className="staff-stat-icon">
                  <Truck size={24} strokeWidth={1.9} />
                </span>
                <div className="staff-stat-body">
                  <span className="staff-stat-label">Out for Delivery</span>
                  <strong className="staff-stat-value">
                    {outForDeliveryCount}
                  </strong>
                  <span className="staff-stat-sub">delivery runs</span>
                </div>
              </article>

              {/* Walk-in orders waiting to be claimed */}
              <article className="staff-stat">
                <span className="staff-stat-icon">
                  <Store size={24} strokeWidth={1.9} />
                </span>
                <div className="staff-stat-body">
                  <span className="staff-stat-label">Ready to Claim</span>
                  <strong className="staff-stat-value">
                    {readyToClaimCount}
                  </strong>
                  <span className="staff-stat-sub">pickup claims</span>
                </div>
              </article>

              {/* Finished orders */}
              <article className="staff-stat">
                <span className="staff-stat-icon">
                  <CheckCircle2 size={24} strokeWidth={1.9} />
                </span>
                <div className="staff-stat-body">
                  <span className="staff-stat-label">Completed</span>
                  <strong className="staff-stat-value">{completedCount}</strong>
                  <span className="staff-stat-sub">finished orders</span>
                </div>
              </article>

              {/* Cancelled orders */}
              <article className="staff-stat">
                <span className="staff-stat-icon">
                  <XCircle size={24} strokeWidth={1.9} />
                </span>
                <div className="staff-stat-body">
                  <span className="staff-stat-label">Cancelled</span>
                  <strong className="staff-stat-value">{cancelledCount}</strong>
                  <span className="staff-stat-sub">cancelled orders</span>
                </div>
              </article>

              {/* Free coffees completed today through a loyalty card */}
              <article className="staff-stat">
                <span className="staff-stat-icon">
                  <Gift size={24} strokeWidth={1.9} />
                </span>
                <div className="staff-stat-body">
                  <span className="staff-stat-label">Loyalty Orders</span>
                  <strong className="staff-stat-value">
                    {loyaltyCompletedToday}
                  </strong>
                  <span className="staff-stat-sub">
                    completed today · {pendingRewards.length} pending claims
                  </span>
                </div>
              </article>
            </div>

            {/* Live queue — the eight most relevant orders, action-first */}
            <section className="staff-card staff-queue-card">
              <header className="staff-card-head">
                <h2>Live Order Queue</h2>
                <a href="/staff/orders" className="staff-view-all">
                  Open Orders <ArrowRight size={12} />
                </a>
              </header>

              {queue.length === 0 ? (
                <p className="staff-empty">
                  No orders yet — new customer orders will appear here.
                </p>
              ) : (
                <div className="staff-queue">
                  {queue.map((order) => renderQueueRow(order))}
                </div>
              )}
            </section>
          </section>
        </div>
      </main>
    </>
  );
}

export default StaffDashboard;